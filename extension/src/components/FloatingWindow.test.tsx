import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FloatingWindow from './FloatingWindow';

describe('FloatingWindow', () => {
  it('renders children correctly', () => {
    render(
      <FloatingWindow>
        <div data-testid="content">Hello Aura</div>
      </FloatingWindow>
    );
    expect(screen.getByTestId('content')).toBeDefined();
    expect(screen.getByText('Hello Aura')).toBeDefined();
  });

  it('renders title correctly', () => {
    render(
      <FloatingWindow title="Test Window">
        <div>Content</div>
      </FloatingWindow>
    );
    expect(screen.getByText('Test Window')).toBeDefined();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <FloatingWindow onClose={onClose}>
        <div>Content</div>
      </FloatingWindow>
    );
    
    // Find close button (SVG or title)
    const closeBtn = screen.getByTitle('Close');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
