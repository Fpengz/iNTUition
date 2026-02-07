import { describe, it, expect, vi, beforeEach } from 'vitest';
import toolRouter from './ToolRouter';
import { themeManager } from '../content/ThemeManager';

vi.mock('../content/ThemeManager', () => ({
    themeManager: {
        applyTheme: vi.fn()
    }
}));

describe('ToolRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.style.fontSize = '';
  });

  it('handles IncreaseFontSize', () => {
    toolRouter.execute('IncreaseFontSize', { scale: 1.5 });
    expect(document.documentElement.style.fontSize).toBe('1.5em');
  });

  it('handles IncreaseFontSize with invalid scale', () => {
    toolRouter.execute('IncreaseFontSize', { scale: 'invalid' });
    expect(document.documentElement.style.fontSize).toBe('');
  });

  it('handles SetTheme', () => {
    toolRouter.execute('SetTheme', { theme: 'dark' });
    expect(themeManager.applyTheme).toHaveBeenCalledWith('dark');
  });

  it('handles unknown tool', () => {
    const spy = vi.spyOn(console, 'warn');
    toolRouter.execute('Unknown', {});
    expect(spy).toHaveBeenCalled();
  });
});