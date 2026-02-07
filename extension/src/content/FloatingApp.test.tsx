import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import FloatingApp from './FloatingApp';

// Mock fetch
global.fetch = vi.fn();

// Mock AuraCardDisplay to test its interactions
vi.mock('../components/AuraCardDisplay', () => ({
    default: ({ summary, actions, onTTSClick, onActionClick }: any) => (
        <div data-testid="card-display">
            <span>{summary}</span>
            <button onClick={() => onTTSClick('test text')}>TTS</button>
            {actions && actions.map((a: string) => (
                <button key={a} onClick={() => onActionClick(a)}>{a}</button>
            ))}
        </div>
    )
}));

describe('FloatingApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('renders correctly', () => {
    render(<FloatingApp />);
    expect(screen.getByText('Aura Assistant')).toBeDefined();
    expect(screen.getByText('Explain Page')).toBeDefined();
  });

  it('toggles settings panel', () => {
    render(<FloatingApp />);
    const settingsBtn = screen.getByText('Settings');
    fireEvent.click(settingsBtn);
    expect(screen.getByText('Appearance:')).toBeDefined();
    expect(screen.getByText('Back')).toBeDefined();
    
    fireEvent.click(screen.getByText('Back'));
    expect(screen.queryByText('Appearance:')).toBeNull();
  });

  it('handles profile changes', async () => {
    render(<FloatingApp />);
    fireEvent.click(screen.getByText('Settings'));
    
    const themeSelect = screen.getByDisplayValue('Default');
    
    (global.fetch as any).mockResolvedValue({ ok: true });

    await act(async () => {
        fireEvent.change(themeSelect, { target: { value: 'dark' } });
    });

    expect(chrome.storage.local.set).toHaveBeenCalledWith(expect.objectContaining({
        auraUserProfile: expect.objectContaining({ theme: 'dark' })
    }));
  });

  it('reacts to externalShowSettings prop', () => {
    const { rerender } = render(<FloatingApp externalShowSettings={false} />);
    expect(screen.queryByText('Appearance:')).toBeNull();

    rerender(<FloatingApp externalShowSettings={true} />);
    expect(screen.getByText('Appearance:')).toBeDefined();
  });

  it('handles streaming explanation', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"type": "summary", "content": "The "}\n\n'));
        controller.enqueue(encoder.encode('data: {"type": "summary", "content": "page"}\n\n'));
        controller.close();
      }
    });

    (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, body: stream })
        .mockResolvedValueOnce({ 
            ok: true, 
            headers: { get: () => '100ms' },
            json: () => Promise.resolve({ action: 'none' }) 
        });

    render(<FloatingApp />);
    
    setTimeout(() => {
        window.postMessage({ type: 'AURA_DOM_RESPONSE', data: { title: 'Test' } }, '*');
    }, 50);

    fireEvent.click(screen.getByText('Explain Page'));

    await waitFor(() => {
        expect(screen.getByText(/The page/)).toBeDefined();
    }, { timeout: 2000 });
  });

  it('handles TTS button click', async () => {
    global.URL.createObjectURL = vi.fn(() => 'blob:url');
    const playSpy = vi.fn();
    global.Audio = vi.fn().mockImplementation(() => ({
        play: playSpy
    })) as any;

    (global.fetch as any).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(['audio'], { type: 'audio/mpeg' }))
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"type": "summary", "content": "text"}\n\n'));
          controller.close();
        }
    });
    (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, body: stream })
        .mockResolvedValueOnce({ ok: true, headers: { get: () => '100ms' }, json: () => Promise.resolve({}) });

    render(<FloatingApp />);
    setTimeout(() => {
        window.postMessage({ type: 'AURA_DOM_RESPONSE', data: { title: 'Test' } }, '*');
    }, 10);
    fireEvent.click(screen.getByText('Explain Page'));

    const ttsBtn = await screen.findByText('TTS');
    fireEvent.click(ttsBtn);

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/tts'), expect.any(Object));
  });

  it('handles UI adaptations and vision verification', async () => {
    (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, body: new ReadableStream({ start(c) { c.close(); } }) })
        .mockResolvedValueOnce({ 
            ok: true, 
            headers: { get: () => '100ms' },
            json: () => Promise.resolve({ 
                action: 'apply_ui', 
                ui_command: { 
                    hide: ['.ads'], 
                    highlight: ['button'], 
                    visual_validation_required: true,
                    explanation: 'Improved accessibility'
                } 
            }) 
        })
        .mockResolvedValueOnce({ 
            ok: true,
            json: () => Promise.resolve({ recommendation: 'rollback' })
        });

    vi.mocked(chrome.runtime.sendMessage).mockReturnValue(Promise.resolve({ dataUrl: 'data:image/png;base64,test' }) as any);

    render(<FloatingApp />);
    setTimeout(() => {
        window.postMessage({ type: 'AURA_DOM_RESPONSE', data: { title: 'Test' } }, '*');
    }, 10);
    fireEvent.click(screen.getByText('Explain Page'));

    await waitFor(() => {
        expect(screen.queryByText('Analyzing...')).toBeNull();
    });

    await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/verify'), expect.any(Object));
    }, { timeout: 3000 });
  });

  it('handles errors in explanation', async () => {
    render(<FloatingApp />);
    
    fireEvent.click(screen.getByText('Explain Page'));

    await waitFor(() => {
        expect(screen.getByText(/DOM scraping timed out/)).toBeDefined();
    }, { timeout: 6000 });
  }, 7000);

  it('handles checkbox profile changes', async () => {
    render(<FloatingApp />);
    fireEvent.click(screen.getByText('Settings'));
    
    const simplifyCheck = screen.getByLabelText('Simplify Language');
    fireEvent.click(simplifyCheck);
    
    expect(chrome.storage.local.set).toHaveBeenCalled();
  });

  it('handles action click', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        start(c) {
            c.enqueue(encoder.encode('data: {"type": "summary", "content": "Summary"}\n\n'));
            c.enqueue(encoder.encode('data: {"type": "action", "content": "Click Me"}\n\n'));
            c.close();
        }
    });

    (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, body: stream })
        .mockResolvedValueOnce({ ok: true, headers: { get: () => '100ms' }, json: () => Promise.resolve({ action: 'none' }) });

    const consoleSpy = vi.spyOn(console, 'log');
    render(<FloatingApp />);
    
    setTimeout(() => {
        window.postMessage({ type: 'AURA_DOM_RESPONSE', data: { title: 'Test' } }, '*');
    }, 10);
    fireEvent.click(screen.getByText('Explain Page'));

    const actionBtn = await screen.findByText('Click Me');
    fireEvent.click(actionBtn);
    
    expect(consoleSpy).toHaveBeenCalledWith("Action clicked:", "Click Me");
  });
});