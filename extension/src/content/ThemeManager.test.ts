import { describe, it, expect, vi, beforeEach } from 'vitest';
import themeManager from './ThemeManager';

describe('ThemeManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.head.innerHTML = '';
    themeManager.removeTheme();
  });

  it('applies dark theme', () => {
    themeManager.applyTheme('dark');
    const style = document.getElementById('aura-theme-dark');
    expect(style).not.toBeNull();
    if (style) {
        expect(style.textContent).toContain('#121212');
        expect(style.textContent).toContain('!important');
    }
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ auraTheme: 'dark' });
  });

  it('applies contrast theme', () => {
    themeManager.applyTheme('contrast');
    const style = document.getElementById('aura-theme-contrast');
    expect(style).not.toBeNull();
    if (style) {
        expect(style.textContent).toContain('#000000');
        expect(style.textContent).toContain('#ffff00');
    }
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ auraTheme: 'contrast' });
  });

  it('removes theme when none is selected', () => {
    themeManager.applyTheme('dark');
    themeManager.applyTheme('none');
    expect(document.getElementById('aura-theme-dark')).toBeNull();
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ auraTheme: 'none' });
  });

  it('does nothing if theme is already active', () => {
    themeManager.applyTheme('dark');
    const spy = vi.spyOn(document.head, 'appendChild');
    themeManager.applyTheme('dark');
    expect(spy).not.toHaveBeenCalled();
  });

  it('loads persisted theme on initialization', async () => {
    (chrome.storage.local.get as any).mockImplementation((_keys: any, cb: (arg: any) => void) => cb({ auraTheme: 'dark' }));
    
    // Force reload
    await import('./ThemeManager?update=' + Date.now());
    
    expect(document.getElementById('aura-theme-dark')).not.toBeNull();
  });

  it('verifies dark mode CSS helper', () => {
    const css = (themeManager as any).getDarkModeCSS();
    expect(css).toContain('background-color: #121212');
  });

  it('verifies high contrast CSS helper', () => {
    const css = (themeManager as any).getHighContrastCSS();
    expect(css).toContain('color: #ffff00');
  });
});
