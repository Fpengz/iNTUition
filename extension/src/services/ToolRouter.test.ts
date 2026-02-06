import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toolRouter } from './ToolRouter';
import { themeManager } from '../content/ThemeManager';

// Mock themeManager
vi.mock('../content/ThemeManager', () => ({
  themeManager: {
    applyTheme: vi.fn(),
  },
}));

describe('ToolRouter', () => {
  beforeEach(() => {
    document.documentElement.style.fontSize = '';
    vi.clearAllMocks();
  });

  it('should handle IncreaseFontSize tool', () => {
    toolRouter.execute('IncreaseFontSize', { scale: 1.5 });
    expect(document.documentElement.style.fontSize).toBe('1.5em');
  });

  it('should handle SetTheme tool', () => {
    toolRouter.execute('SetTheme', { theme: 'dark' });
    expect(themeManager.applyTheme).toHaveBeenCalledWith('dark');
  });

  it('should log warning for unknown tool', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    toolRouter.execute('UnknownTool', {});
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown tool'));
  });
});
