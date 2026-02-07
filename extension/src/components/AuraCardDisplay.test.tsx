import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AuraCardDisplay from './AuraCardDisplay';

describe('AuraCardDisplay', () => {
  it('renders correctly', () => {
    const summary = "Test summary";
    const actions = ["Action 1", "Action 2"];
    const processTime = "0.150"; // 150ms
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
    expect(screen.getByText('150ms')).toBeDefined();
  });

  it('triggers onTTSClick when listen button is clicked', () => {
    const onTTSClick = vi.fn();
    render(<AuraCardDisplay summary="test" actions={[]} onTTSClick={onTTSClick} onActionClick={vi.fn()} />);
    
    fireEvent.click(screen.getByTitle('Listen to summary'));
    expect(onTTSClick).toHaveBeenCalledWith('test');
  });

  it('triggers onActionClick when action button is clicked', () => {
    const onActionClick = vi.fn();
    render(<AuraCardDisplay summary="test" actions={['Do something']} onTTSClick={vi.fn()} onActionClick={onActionClick} />);
    
    fireEvent.click(screen.getByText('Do something'));
    expect(onActionClick).toHaveBeenCalledWith('Do something');
  });

  it('shows typing indicator when streaming', () => {
    render(<AuraCardDisplay summary="test" actions={[]} isStreaming={true} onTTSClick={vi.fn()} onActionClick={vi.fn()} />);
    expect(document.querySelector('.typing-indicator')).toBeDefined();
  });
});
