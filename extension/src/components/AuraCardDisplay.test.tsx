import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AuraCardDisplay from './AuraCardDisplay';

// Mock Framer Motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}));

describe('AuraCardDisplay', () => {
  it('renders correctly', () => {
    const summary = "Test summary";
    const actions = ["Action 1", "Action 2"];
    const processTime = "0.150"; 
    const onTTSClick = vi.fn();
    const onActionClick = vi.fn();

    render(
      <AuraCardDisplay 
        summary={summary} 
        actions={actions} 
        processTime={processTime}
        onTTSClick={onTTSClick}
        onActionClick={onActionClick}
      />
    );

    expect(screen.getByText(summary)).toBeDefined();
    expect(screen.getByText('Action 1')).toBeDefined();
    expect(screen.getByText(/150MS/i)).toBeDefined();
  });

  it('triggers onTTSClick when listen button is clicked', () => {
    const onTTSClick = vi.fn();
    render(<AuraCardDisplay summary="test" actions={[]} onTTSClick={onTTSClick} onActionClick={vi.fn()} />);
    
    fireEvent.click(screen.getByText(/Listen/i));
    expect(onTTSClick).toHaveBeenCalledWith('test');
  });

  it('triggers onActionClick when action button is clicked', () => {
    const onActionClick = vi.fn();
    render(<AuraCardDisplay summary="test" actions={['Do something']} onTTSClick={vi.fn()} onActionClick={onActionClick} />);
    
    fireEvent.click(screen.getByText('Do something'));
    expect(onActionClick).toHaveBeenCalledWith('Do something');
  });
});