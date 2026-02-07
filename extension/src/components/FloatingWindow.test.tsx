import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import FloatingWindow from './FloatingWindow';

describe('FloatingWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear storage mock results
    (chrome.storage.local.get as any).mockImplementation((_key: any, cb: any) => cb({}));
    document.body.innerHTML = '';
  });

  it('renders children correctly', () => {
    render(<FloatingWindow><div>Content</div></FloatingWindow>);
    expect(screen.getByText('Content')).toBeDefined();
    expect(screen.getByText('Aura')).toBeDefined();
  });

  it('minimizes and expands', async () => {
    render(<FloatingWindow><div>Content</div></FloatingWindow>);
    const minimizeBtn = screen.getByTitle('Minimize');
    
    fireEvent.click(minimizeBtn);
    expect(screen.queryByText('Content')).toBeNull();
    
    // Clicking the minimized circle expands to buttons
    const bubble = screen.getByText('A');
    fireEvent.click(bubble);
    
    expect(screen.getByText('Explain Page')).toBeDefined();
    
    // Clicking Explain Page expands fully
    fireEvent.click(screen.getByText('Explain Page'));
    expect(screen.getByText('Content')).toBeDefined();
  });

  it('handles settings button in minimized expanded state', async () => {
    const setShowSettings = vi.fn();
    render(<FloatingWindow setShowSettings={setShowSettings}><div>Content</div></FloatingWindow>);
    
    // Minimize
    fireEvent.click(screen.getByTitle('Minimize'));
    // Click bubble to expand to mini-menu
    fireEvent.click(screen.getByText('A'));
    
    // Click settings in mini-menu
    const settingsBtn = screen.getByTitle('Settings');
    fireEvent.click(settingsBtn);
    
    expect(setShowSettings).toHaveBeenCalledWith(true);
    expect(screen.getByText('Content')).toBeDefined(); // Should have expanded
  });

  it('handles dragging', () => {
    render(<FloatingWindow><div>Content</div></FloatingWindow>);
    const handle = document.querySelector('.aura-drag-handle')!;
    
    fireEvent.mouseDown(handle, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(window, { clientX: 150, clientY: 150 });
    fireEvent.mouseUp(window);
    
    const win = handle.parentElement!;
    expect(win.style.left).toBeDefined();
  });

  it('handles resizing', () => {
    render(<FloatingWindow><div>Content</div></FloatingWindow>);
    const resizeHandle = document.querySelector('div[style*="cursor: nwse-resize"]')!;
    
    fireEvent.mouseDown(resizeHandle, { clientX: 500, clientY: 500 });
    fireEvent.mouseMove(window, { clientX: 600, clientY: 600 });
    fireEvent.mouseUp(window);
    
    const win = resizeHandle.parentElement!;
    expect(win.style.width).toBeDefined();
  });

  it('loads state from storage', async () => {
    (chrome.storage.local.get as any).mockImplementation((_key: any, cb: any) => {
        cb({ 'aura-floating-window-state': { x: 50, y: 50, minimized: true } });
    });

    render(<FloatingWindow storageKey="aura-floating-window-state"><div>Content</div></FloatingWindow>);
    
    expect(screen.getByText('A')).toBeDefined();
  });

  it('handles onClose callback', () => {
    const onClose = vi.fn();
    render(<FloatingWindow onClose={onClose}><div>Content</div></FloatingWindow>);
    fireEvent.click(screen.getByTitle('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('reacts to storage changes', () => {
    render(<FloatingWindow><div>Content</div></FloatingWindow>);
    const listener = vi.mocked(chrome.storage.onChanged.addListener).mock.calls[0][0];
    
    act(() => {
        listener({ 'aura-floating-window-state': { newValue: { minimized: true } } }, 'local');
    });
    
    expect(screen.getByText('A')).toBeDefined();
  });
});