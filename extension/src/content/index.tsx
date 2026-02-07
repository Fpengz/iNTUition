import React from 'react';
import { createRoot } from 'react-dom/client';
import ShadowRoot from './ShadowRoot';
import FloatingWindow from '../components/FloatingWindow';
import FloatingApp from './FloatingApp';
import { themeManager } from './ThemeManager';
import type { AuraTheme } from './ThemeManager';
import { textVide } from "text-vide";

/**
 * Aura Content Script - Redesigned for iNTUition 2026
 * Primary interface is now a floating agentic bubble.
 */

export const scrapePage = () => {
  const elements = document.querySelectorAll('button, a, input, h1, h2, h3, [role="button"], [role="link"], [role="menuitem"]');
  const vh = window.innerHeight;
  const vw = window.innerWidth;

  const mainContent = document.querySelector('main, article, #content, .content, .post-content') as HTMLElement;
  const mainSelector = mainContent ? (mainContent.id ? `#${mainContent.id}` : 'main') : 'body';

  const distilledElements = Array.from(elements)
    .filter(el => {
      if (el.closest('#aura-extension-mount') || el.closest('#aura-extension-root')) return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
      const rect = el.getBoundingClientRect();
      if (rect.width < 5 || rect.height < 5) return false;
      return true;
    })
    .map((el, index) => {
      let auraId = el.getAttribute('data-aura-id');
      if (!auraId) {
        auraId = `aura-el-${index}`;
        el.setAttribute('data-aura-id', auraId);
      }
      const rect = el.getBoundingClientRect();
      const inViewport = (rect.top >= 0 && rect.left >= 0 && rect.bottom <= vh && rect.right <= vw);
      const text = (el.textContent?.trim() || (el as HTMLInputElement).placeholder || el.getAttribute('aria-label') || '').slice(0, 200);
      return {
        role: el.tagName.toLowerCase() === 'a' ? 'link' : el.getAttribute('role') || el.tagName.toLowerCase(),
        text: text,
        selector: `[data-aura-id="${auraId}"]`,
        aria_label: el.getAttribute('aria-label'),
        in_viewport: inViewport,
        y: rect.top,
        is_main_content: mainContent?.contains(el) || false
      };
    })
    .filter(item => item.text.length > 0 || ['input', 'button', 'link'].includes(item.role))
    .sort((a, b) => (a.in_viewport && !b.in_viewport) ? -1 : (!a.in_viewport && b.in_viewport) ? 1 : a.y - b.y);

  const bodyText = (mainContent?.textContent || document.body.textContent || "").slice(0, 2000).replace(/\s+/g, ' ');

  return {
    title: document.title,
    url: window.location.href,
    elements: distilledElements,
    main_selector: mainSelector,
    content_summary: bodyText
  };
};

const resetAdaptations = () => {
    document.querySelectorAll(".aura-highlight-active").forEach(el => el.classList.remove("aura-highlight-active"));
    document.querySelectorAll(".aura-upscaled").forEach(el => el.classList.remove("aura-upscaled"));
    document.querySelectorAll(".aura-annotation-tooltip").forEach(el => el.remove());
    document.body.classList.remove("aura-focus-mode", "aura-simplified-mode");
    document.querySelectorAll("[data-aura-hidden]").forEach(el => (el as HTMLElement).removeAttribute("data-aura-hidden"));
    document.querySelectorAll(".aura-dimmed").forEach(el => el.classList.remove("aura-dimmed"));
};

const applyBionicReading = () => {
    const paragraphs = document.querySelectorAll('p, li, span, h1, h2, h3, h4, h5, h6');
    paragraphs.forEach(p => {
        if (p.hasAttribute('data-aura-bionic') || p.closest('.aura-annotation-tooltip')) return;
        if (p.textContent && p.textContent.length > 20) {
            const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT, null);
            let node;
            const nodesToReplace: { node: Node, newHtml: string }[] = [];
            while (node = walker.nextNode()) {
                if (node.nodeValue && node.nodeValue.trim().length > 3) {
                    const newHtml = textVide(node.nodeValue);
                    nodesToReplace.push({ node, newHtml });
                }
            }
            nodesToReplace.forEach(({ node, newHtml }) => {
                const span = document.createElement('span');
                span.innerHTML = newHtml;
                node.parentNode?.replaceChild(span, node);
            });
            p.setAttribute('data-aura-bionic', 'true');
        }
    });
};

const applyAdaptations = (adaptations: any) => {
    const { hide_elements, highlight_elements, layout_mode, apply_bionic, theme } = adaptations;
    resetAdaptations();

    if (apply_bionic) applyBionicReading();
    if (theme) themeManager.applyTheme(theme as AuraTheme);

    hide_elements?.forEach((selector: string) => {
        const el = document.querySelector(selector);
        if (el) (el as HTMLElement).setAttribute("data-aura-hidden", "true");
    });

    highlight_elements?.forEach((selector: string) => {
        const el = document.querySelector(selector) as HTMLElement;
        if (el) {
            el.classList.add("aura-highlight-active");
            el.classList.add("aura-upscaled");
        }
    });

    if (layout_mode === "simplified") {
        document.body.classList.add("aura-simplified-mode");
    } else if (layout_mode === "focus") {
        document.body.classList.add("aura-focus-mode");
        document.querySelectorAll("body > *:not(script):not(style)").forEach(el => {
            if (el.id === 'aura-extension-mount' || el.id === 'aura-extension-root') return;
            const hasHighlight = el.querySelector(".aura-highlight-active") || el.classList.contains("aura-highlight-active");
            if (!hasHighlight) el.classList.add("aura-dimmed");
        });
    }
};

// --- Styles Injection ---

const style = document.createElement('style');
style.id = 'aura-adaptation-styles';
style.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

  .aura-highlight-active {
    outline: 5px solid #6366f1 !important;
    outline-offset: 4px !important;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    position: relative !important;
    z-index: 10000 !important;
    transform: scale(1.05);
  }
  .aura-upscaled {
    transform: scale(1.25) !important;
    z-index: 10001 !important;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
  }
  .aura-focus-mode .aura-dimmed {
    opacity: 0.1 !important;
    pointer-events: none !important;
    filter: blur(2px) !important;
    transition: all 0.5s ease !important;
  }
  .aura-simplified-mode [data-aura-hidden="true"] {
    display: none !important;
  }
  
  /* Bionic Reading Styles */
  b { font-weight: 700 !important; color: inherit !important; }
`;
document.head.appendChild(style);

// --- Bridge for Floating UI ---

window.addEventListener('message', (event) => {
    if (event.data.type === 'AURA_GET_DOM') {
        const data = scrapePage();
        window.postMessage({ type: 'AURA_DOM_RESPONSE', data }, '*');
    } else if (event.data.type === 'AURA_ADAPT_UI') {
        if (event.data.adaptations.reset) {
            resetAdaptations();
            themeManager.applyTheme('none');
        } else {
            applyAdaptations(event.data.adaptations);
        }
    } else if (event.data.type === 'AURA_SET_THEME') {
        themeManager.applyTheme(event.data.theme as AuraTheme);
    }
});

// --- Message Listener (from Background) ---

chrome.runtime.onMessage.addListener(
  (
    request: { action: string; selector?: string; adaptations?: any; theme?: string },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ) => {
    if (request.action === "TOGGLE_AURA") {
        const root = document.getElementById('aura-extension-mount');
        if (root) {
            root.style.display = root.style.display === 'none' ? 'block' : 'none';
        } else {
            initFloatingUI();
        }
        sendResponse({ success: true });
    } else if (request.action === "GET_DOM") {
      try {
        const data = scrapePage();
        sendResponse(data);
      } catch (err) {
        sendResponse({ error: "Scraping failed", details: String(err) });
      }
    } else if (request.action === "ADAPT_UI" && request.adaptations) {
        applyAdaptations(request.adaptations);
        sendResponse({ success: true, status: "adapted" });
    } else if (request.action === "RESET_UI") {
        resetAdaptations();
        sendResponse({ success: true, status: "reset" });
    } else if (request.action === "HIGHLIGHT" && request.selector) {
        const el = document.querySelector(request.selector) as HTMLElement;
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("aura-highlight-active");
            setTimeout(() => el.classList.remove("aura-highlight-active"), 3000);
            sendResponse({ success: true });
        } else {
            sendResponse({ error: "Element not found" });
        }
    } else if (request.action === "SET_THEME" && request.theme) {
        themeManager.applyTheme(request.theme as AuraTheme);
        sendResponse({ success: true });
    }
    return true;
  }
);

// --- UI Injection ---

const FloatingContainer = () => {
    const shadowStyles = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        :host { font-family: 'Inter', system-ui, sans-serif; }
    `;

    return (
        <React.StrictMode>
            <ShadowRoot css={[shadowStyles]}>
                <FloatingWindow title="Aura Assistant">
                    <FloatingApp />
                </FloatingWindow>
            </ShadowRoot>
        </React.StrictMode>
    );
};

const initFloatingUI = () => {
    if (document.getElementById('aura-extension-mount')) {
        const existing = document.getElementById('aura-extension-mount');
        if (existing) existing.style.display = 'block';
        return;
    }
    const container = document.createElement('div');
    container.id = 'aura-extension-mount';
    container.style.display = 'block';
    container.style.position = 'fixed';
    container.style.zIndex = '2147483647';
    document.body.appendChild(container);
    const root = createRoot(container);
    root.render(<FloatingContainer />);
};

if (document.body) {
    initFloatingUI();
} else {
    document.addEventListener('DOMContentLoaded', initFloatingUI);
}

console.log("Aura Redesigned UI Active.");
