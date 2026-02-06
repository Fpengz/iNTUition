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
      div, section, nav, article, aside, main, header, footer {
        background-color: transparent !important;
        color: inherit !important;
        border-color: #333 !important;
      }

      /* Text safety */
      p, span, h1, h2, h3, h4, h5, h6, li, td, th {
        color: #e0e0e0 !important;
      }

      /* Links */
      a {
        color: #8ab4f8 !important;
        text-decoration: underline !important;
      }

      /* Form elements */
      input, textarea, select, button {
        background-color: #1e1e1e !important;
        color: #e0e0e0 !important;
        border: 1px solid #444 !important;
      }

      /* Media Protection: NEVER invert or dim images/videos too much */
      img, video, canvas, iframe, [role="img"] {
        filter: brightness(0.8) contrast(1.1) !important;
        background-color: transparent !important;
      }

      /* Keep Aura UI safe */
      #aura-extension-mount, #aura-extension-root {
        filter: none !important;
      }
    `;
  }

  private getHighContrastCSS(): string {
    return `
      * {
        background-color: #000000 !important;
        color: #ffffff !important;
        border-color: #ffffff !important;
        box-shadow: none !important;
        text-shadow: none !important;
        transition: background-color 0.2s ease, color 0.2s ease !important;
      }

      a, a * {
        color: #ffff00 !important;
        text-decoration: underline !important;
        font-weight: bold !important;
      }

      input, textarea, select, button {
        background-color: #000000 !important;
        color: #ffffff !important;
        border: 2px solid #ffffff !important;
        outline: 1px solid #ffff00 !important;
      }

      /* Critical Media Protection */
      img, video, canvas, iframe, [role="img"] {
        filter: none !important;
        border: 2px solid #ffffff !important;
      }

      /* Highlight active elements */
      :focus {
        outline: 4px solid #ffff00 !important;
        outline-offset: 2px !important;
      }

      /* Keep Aura UI safe */
      #aura-extension-mount, #aura-extension-root, #aura-extension-root * {
        all: revert; /* Attempt to protect extension UI */
      }
    `;
  }
}

export const themeManager = new ThemeManager();
export default themeManager;
