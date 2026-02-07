import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FloatingApp from './FloatingApp';

// Mock fetch
global.fetch = vi.fn();

// Mock Framer Motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock AuraCardDisplay
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
    expect(screen.getByText('Hello!')).toBeDefined();
    expect(screen.getByText('Analyze Page')).toBeDefined();
  });

  it('toggles settings panel', () => {
    render(<FloatingApp />);
    // Settings icon button
    const settingsBtn = document.querySelector('button svg')?.parentElement!;
    fireEvent.click(settingsBtn);
    expect(screen.getByText('Preferences')).toBeDefined();
    
    // Back icon button
    const backBtn = document.querySelector('button svg')?.parentElement!;
    fireEvent.click(backBtn);
    expect(screen.queryByText('Preferences')).toBeNull();
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

    fireEvent.click(screen.getByText('Analyze Page'));

    await waitFor(() => {
        expect(screen.getByText(/The page/)).toBeDefined();
    }, { timeout: 2000 });
  });

  it('handles errors in explanation', async () => {
    render(<FloatingApp />);
    
    fireEvent.click(screen.getByText('Analyze Page'));

    await waitFor(() => {
        expect(screen.getByText(/DOM scraping timed out/)).toBeDefined();
    }, { timeout: 6000 });
  }, 7000);
});
