import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FloatingWindow from './FloatingWindow';

// Mock Framer Motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('FloatingWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (chrome.storage.local.get as any).mockImplementation((_key: any, cb: any) => cb({}));
    document.body.innerHTML = '';
  });

  it('renders correctly', () => {
    render(<FloatingWindow><div>Content</div></FloatingWindow>);
    // Starts minimized by default in our new implementation or based on storage
    // But let's check for the "A" logo
    expect(screen.getByText('A')).toBeDefined();
  });

  it('expands on click', async () => {
    render(<FloatingWindow><div>Content</div></FloatingWindow>);
    const bubble = screen.getByText('A');
    
    // Simulate mouse down and up without moving to trigger click
    fireEvent.mouseDown(bubble, { clientX: 100, clientY: 100 });
    fireEvent.mouseUp(window, { clientX: 100, clientY: 100 });
    
    expect(screen.getByText('Content')).toBeDefined();
  });

  it('minimizes back', async () => {
    // Force expanded via storage
    (chrome.storage.local.get as any).mockImplementation((_key: any, cb: any) => {
        cb({ 'aura-floating-window-state': { expanded: true } });
    });

    render(<FloatingWindow><div>Content</div></FloatingWindow>);
    expect(screen.getByText('Content')).toBeDefined();
    
    const minimizeBtn = screen.getByTitle('Minimize');
    fireEvent.click(minimizeBtn);
    
    expect(screen.queryByText('Content')).toBeNull();
    expect(screen.getByText('A')).toBeDefined();
  });

  it('handles onClose callback', async () => {
    (chrome.storage.local.get as any).mockImplementation((_key: any, cb: any) => {
        cb({ 'aura-floating-window-state': { expanded: true } });
    });
    
    const onClose = vi.fn();
    render(<FloatingWindow onClose={onClose}><div>Content</div></FloatingWindow>);
    fireEvent.click(screen.getByTitle('Close'));
    expect(onClose).toHaveBeenCalled();
  });
});
