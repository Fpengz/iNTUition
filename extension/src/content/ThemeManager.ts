/**
 * Aura Theme Manager
 * Responsibility: Apply and manage high-contrast and dark mode themes safely.
 */

export type AuraTheme = 'none' | 'dark' | 'contrast';

class ThemeManager {
  private currentTheme: AuraTheme = 'none';
  private styleElement: HTMLStyleElement | null = null;

  constructor() {
    this.loadPersistedTheme();
  }

  private loadPersistedTheme() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['auraTheme'], (result) => {
        if (result.auraTheme) {
          this.applyTheme(result.auraTheme as AuraTheme);
        }
      });
    }
  }

  public applyTheme(theme: AuraTheme) {
    if (this.currentTheme === theme) return;
    
    this.removeTheme();
    this.currentTheme = theme;

    if (theme === 'none') {
      this.persistTheme('none');
      return;
    }

    this.styleElement = document.createElement('style');
    this.styleElement.id = `aura-theme-${theme}`;
    
    if (theme === 'dark') {
      this.styleElement.textContent = this.getDarkModeCSS();
    } else if (theme === 'contrast') {
      this.styleElement.textContent = this.getHighContrastCSS();
    }

    document.head.appendChild(this.styleElement);
    this.persistTheme(theme);
  }

  public removeTheme() {
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
    this.currentTheme = 'none';
  }

  private persistTheme(theme: AuraTheme) {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ auraTheme: theme });
    }
  }

  private getDarkModeCSS(): string {
    return `
      html, body {
        background-color: #121212 !important;
        color: #e0e0e0 !important;
        transition: background-color 0.3s ease, color 0.3s ease !important;
      }

      /* Base layout elements should be transparent to show body bg */
      div:not(#aura-extension-root *), 
      section:not(#aura-extension-root *), 
      nav:not(#aura-extension-root *), 
      article:not(#aura-extension-root *), 
      aside:not(#aura-extension-root *), 
      main:not(#aura-extension-root *), 
      header:not(#aura-extension-root *), 
      footer:not(#aura-extension-root *) {
        background-color: transparent !important;
        color: inherit !important;
        border-color: #333 !important;
      }

      /* Text safety */
      p:not(#aura-extension-root *), 
      span:not(#aura-extension-root *), 
      h1:not(#aura-extension-root *), 
      h2:not(#aura-extension-root *), 
      h3:not(#aura-extension-root *), 
      h4:not(#aura-extension-root *), 
      h5:not(#aura-extension-root *), 
      h6:not(#aura-extension-root *), 
      li:not(#aura-extension-root *), 
      td:not(#aura-extension-root *), 
      th:not(#aura-extension-root *) {
        color: #e0e0e0 !important;
      }

      /* Links */
      a:not(#aura-extension-root *) {
        color: #8ab4f8 !important;
        text-decoration: underline !important;
      }

      /* Form elements */
      input:not(#aura-extension-root *), 
      textarea:not(#aura-extension-root *), 
      select:not(#aura-extension-root *), 
      button:not(#aura-extension-root *) {
        background-color: #1e1e1e !important;
        color: #e0e0e0 !important;
        border: 1px solid #444 !important;
      }

      /* Media Protection: NEVER invert or dim images/videos too much */
      img:not(#aura-extension-root *), 
      video:not(#aura-extension-root *), 
      canvas:not(#aura-extension-root *), 
      iframe:not(#aura-extension-root *), 
      [role="img"]:not(#aura-extension-root *) {
        filter: brightness(0.8) contrast(1.1) !important;
        background-color: transparent !important;
      }
    `;
  }

  private getHighContrastCSS(): string {
    return `
      *:not(#aura-extension-root *):not(#aura-extension-mount *) {
        background-color: #000000 !important;
        color: #ffffff !important;
        border-color: #ffffff !important;
        box-shadow: none !important;
        text-shadow: none !important;
        transition: background-color 0.2s ease, color 0.2s ease !important;
      }

      a:not(#aura-extension-root *), a:not(#aura-extension-root *) * {
        color: #ffff00 !important;
        text-decoration: underline !important;
        font-weight: bold !important;
      }

      input:not(#aura-extension-root *), 
      textarea:not(#aura-extension-root *), 
      select:not(#aura-extension-root *), 
      button:not(#aura-extension-root *) {
        background-color: #000000 !important;
        color: #ffffff !important;
        border: 2px solid #ffffff !important;
        outline: 1px solid #ffff00 !important;
      }

      /* Critical Media Protection */
      img:not(#aura-extension-root *), 
      video:not(#aura-extension-root *), 
      canvas:not(#aura-extension-root *), 
      iframe:not(#aura-extension-root *), 
      [role="img"]:not(#aura-extension-root *) {
        filter: none !important;
        border: 2px solid #ffffff !important;
      }

      /* Highlight active elements */
      :focus:not(#aura-extension-root *) {
        outline: 4px solid #ffff00 !important;
        outline-offset: 2px !important;
      }
    `;
  }
}

export const themeManager = new ThemeManager();
export default themeManager;
