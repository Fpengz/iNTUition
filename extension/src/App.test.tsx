import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

// Mock fetch
global.fetch = vi.fn();

// Mock AuraCardDisplay
vi.mock('./components/AuraCardDisplay', () => ({
    default: ({ summary, onTTSClick, onActionClick }: any) => (
        <div data-testid="card-display">
            <span>{summary}</span>
            <button onClick={() => onTTSClick('text')}>TTS</button>
            <button onClick={() => onActionClick('action')}>Action</button>
        </div>
    )
}));

describe('App (Side Panel)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (chrome.tabs.query as any).mockResolvedValue([{ id: 1, url: 'http://test.com' }]);
    (chrome.tabs.sendMessage as any).mockResolvedValue({ title: 'Test Page' });
    (chrome.storage.local.get as any).mockImplementation((_keys: any, cb: (arg: any) => void) => cb({}));
    
    (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: { get: () => '100ms' },
        json: () => Promise.resolve({ action: 'none' }),
        text: () => Promise.resolve('ok'),
        blob: () => Promise.resolve(new Blob())
    });
  });

  it('renders correctly', () => {
    render(<App />);
    expect(screen.getByText('Aura')).toBeDefined();
    expect(screen.getByText('Explain')).toBeDefined();
  });

  it('toggles settings', () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText('Settings'));
    expect(screen.getByText('Accessibility Identity')).toBeDefined();
    
    fireEvent.click(screen.getByLabelText('Settings'));
    expect(screen.queryByText('Accessibility Identity')).toBeNull();
  });

  it('triggers explanation flow', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        start(c) {
            c.enqueue(encoder.encode('data: {"type": "summary", "content": "Summary"}\n\n'));
            c.close();
        }
    });

    (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, body: stream }) 
        .mockResolvedValueOnce({ 
            ok: true,
            headers: { get: (name: string) => name === 'X-Process-Time' ? '100ms' : null },
            json: () => Promise.resolve({ action: 'apply_ui', ui_command: { explanation: 'Done' } })
        });

    render(<App />);
    fireEvent.click(screen.getByText('Explain'));

    await waitFor(() => {
        expect(screen.getByText('Done')).toBeDefined();
    }, { timeout: 2000 });
  });

  it('handles proactive help trigger from storage', async () => {
    (chrome.storage.local.get as any).mockImplementation((_keys: any, cb: (arg: any) => void) => {
        cb({ auraProactiveHelpTriggered: true });
    });

    render(<App />);
    
    await waitFor(() => {
        expect(screen.getByText(/Struggling\?/)).toBeDefined();
    });
    
    fireEvent.click(screen.getByText('Dismiss'));
    expect(screen.queryByText(/Struggling\?/)).toBeNull();
  });

  it('handles wake word trigger from storage', async () => {
    (chrome.storage.local.get as any).mockImplementation((_keys: any, cb: (arg: any) => void) => {
        cb({ auraWakeWordTriggered: true });
    });

    render(<App />);
    
    // It should trigger explain automatically
    await waitFor(() => {
        expect(chrome.storage.local.remove).toHaveBeenCalledWith('auraWakeWordTriggered');
        expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, { action: "GET_DOM" });
    });
  });

  it('handles streaming actions and errors', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        start(c) {
            c.enqueue(encoder.encode('data: {"type": "action", "content": "Click button"}\n\n'));
            c.enqueue(encoder.encode('data: {"type": "error", "content": "Stream Fail"}\n\n'));
            c.close();
        }
    });

    (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, body: stream })
        .mockResolvedValueOnce({ ok: true, headers: { get: () => '100ms' }, json: () => Promise.resolve({ action: 'none' }) });

    render(<App />);
    fireEvent.click(screen.getByText('Explain'));

    await waitFor(() => {
        expect(screen.getByText(/Stream Fail/)).toBeDefined();
    });
  });

  it('handles feedback', async () => {
    (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, body: new ReadableStream({ start(c) { c.close(); } }) })
        .mockResolvedValueOnce({ 
            ok: true, 
            headers: { get: () => '100ms' },
            json: () => Promise.resolve({ action: 'apply_ui', ui_command: { explanation: 'Helpful' } }) 
        })
        .mockResolvedValue({ ok: true }); 

    render(<App />);
    fireEvent.click(screen.getByText('Explain'));
    
    const yesBtn = await screen.findByText('Yes');
    fireEvent.click(yesBtn);

    await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/feedback'), expect.any(Object));
    });

    // Re-trigger showFeedback for 'No'
    (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, body: new ReadableStream({ start(c) { c.close(); } }) })
        .mockResolvedValueOnce({ 
            ok: true, 
            headers: { get: () => '100ms' },
            json: () => Promise.resolve({ action: 'apply_ui', ui_command: { explanation: 'Helpful' } }) 
        });
    fireEvent.click(screen.getByText('Explain'));

    const noBtn = await screen.findByText('No');
    fireEvent.click(noBtn);
    await waitFor(() => {
        expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, expect.objectContaining({ action: "RESET_UI" }));
    });
  });

  it('handles all settings checkboxes', async () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText('Settings'));
    
    fireEvent.click(screen.getByLabelText('Simplify Language'));
    fireEvent.click(screen.getByLabelText('Upscale Click Targets'));
    fireEvent.click(screen.getByLabelText('High Contrast'));
    fireEvent.click(screen.getByLabelText('Automatic Speech (TTS)'));
    
    expect(chrome.storage.local.set).toHaveBeenCalled();
  });

  it('handles sensory and motor select changes', async () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText('Settings'));
    
    fireEvent.change(screen.getByLabelText('Precision:'), { target: { value: 'limited' } });
    fireEvent.change(screen.getByLabelText('Vision Acuity:'), { target: { value: 'low' } });

    expect(chrome.storage.local.set).toHaveBeenCalled();
  });

  it('handles TTS error', async () => {
    (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, body: new ReadableStream({ start(c) { c.close(); } }) })
        .mockResolvedValueOnce({ 
            ok: true, 
            headers: { get: () => '100ms' },
            json: () => Promise.resolve({ action: 'apply_ui', ui_command: { explanation: 'TTS Fail' } }) 
        })
        .mockResolvedValueOnce({ ok: false }); 

    render(<App />);
    fireEvent.click(screen.getByText('Explain'));
    
    const ttsBtn = await screen.findByText('TTS');
    fireEvent.click(ttsBtn);

    await waitFor(() => {
        expect(screen.getByText(/TTS Error/)).toBeDefined();
    });
  });

  it('handles action button click', async () => {
    (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, body: new ReadableStream({ start(c) { c.close(); } }) })
        .mockResolvedValueOnce({ 
            ok: true, 
            headers: { get: () => '100ms' },
            json: () => Promise.resolve({ action: 'apply_ui', ui_command: { explanation: 'Act' } }) 
        })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ selector: '#btn' }) }); 

    render(<App />);
    fireEvent.click(screen.getByText('Explain'));
    
    const actBtn = await screen.findByText('Action');
    fireEvent.click(actBtn);

    await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/action'), expect.any(Object));
        expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, expect.objectContaining({ action: "HIGHLIGHT" }));
    });
  });

  it('handles action click error', async () => {
    (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, body: new ReadableStream({ start(c) { c.close(); } }) })
        .mockResolvedValueOnce({ 
            ok: true, 
            headers: { get: () => '100ms' },
            json: () => Promise.resolve({ action: 'apply_ui', ui_command: { explanation: 'Act' } }) 
        })
        .mockRejectedValue(new Error('Action Fail')); 

    render(<App />);
    fireEvent.click(screen.getByText('Explain'));
    
    const actBtn = await screen.findByText('Action');
    const consoleSpy = vi.spyOn(console, 'error');
    fireEvent.click(actBtn);

    await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Action mapping failed:', expect.any(Error));
    });
  });

  it('handles suggest_help action', async () => {
    (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, body: new ReadableStream({ start(c) { c.close(); } }) })
        .mockResolvedValueOnce({ 
            ok: true, 
            headers: { get: () => '100ms' },
            json: () => Promise.resolve({ action: 'suggest_help', message: 'Need help?' }) 
        });

    render(<App />);
    fireEvent.click(screen.getByText('Explain'));

    await waitFor(() => {
        expect(screen.getByText('Need help?')).toBeDefined();
    });
  });

  it('handles mock fallback', async () => {
    (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, body: new ReadableStream({ start(c) { c.close(); } }) })
        .mockResolvedValueOnce({ 
            ok: true, 
            headers: { get: () => '100ms' },
            json: () => Promise.resolve({ action: 'apply_ui', mode: 'mock_fallback' }) 
        });

    render(<App />);
    fireEvent.click(screen.getByText('Explain'));
    
    await waitFor(() => {
        expect(screen.queryByText('...')).toBeNull();
    });
  });

  it('handles explanation error', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network Fail'));
    
    render(<App />);
    fireEvent.click(screen.getByText('Explain'));
    
    await waitFor(() => {
        expect(screen.getByRole('alert').textContent).toContain('Network Fail');
    });
  });
});