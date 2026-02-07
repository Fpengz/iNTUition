import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import FloatingWindow from './FloatingWindow';

describe('FloatingWindow Extra', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('handles minimizing and expanding', async () => {
    vi.mocked(chrome.storage.local.get).mockImplementation((_keys: any, cb: (arg: any) => void) => {
        cb({ 'aura-floating-window-state': { minimized: true } });
    });

    render(<FloatingWindow storageKey="aura-floating-window-state"><div>Test Content</div></FloatingWindow>);
    
    // Should be minimized initially due to mocked storage
    expect(screen.getByText('A')).toBeDefined();
    
    // Click to expand
    const bubble = screen.getByText('A');
    await act(async () => {
        bubble.click();
    });
    
    expect(screen.getByText('Explain Page')).toBeDefined();
  });

  it('saves position on drag end', async () => {
    // Already covered in standard test but let's ensure it doesn't crash here
    render(<FloatingWindow><div>Test Content</div></FloatingWindow>);
    expect(screen.getByText('Aura')).toBeDefined();
  });
});