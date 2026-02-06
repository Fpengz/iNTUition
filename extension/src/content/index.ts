/**
 * Aura Content Script
 * Responsibility: Scrape the page for accessible elements and handle highlights.
 */

export const scrapePage = () => {
  const elements = document.querySelectorAll('button, a, input, h1, h2, h3, [role="button"], [role="link"], [role="menuitem"]');
  const vh = window.innerHeight;
  const vw = window.innerWidth;

  const distilledElements = Array.from(elements)
    .filter(el => {
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
      // Check if element is in viewport
      const inViewport = (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= vh &&
        rect.right <= vw
      );

      const text = (el.textContent?.trim() || (el as HTMLInputElement).placeholder || el.getAttribute('aria-label') || '').slice(0, 200);

      return {
        role: el.tagName.toLowerCase() === 'a' ? 'link' : el.getAttribute('role') || el.tagName.toLowerCase(),
        text: text,
        selector: `[data-aura-id="${auraId}"]`,
        aria_label: el.getAttribute('aria-label'),
        in_viewport: inViewport,
        y: rect.top // Store vertical position for secondary sorting
      };
    })
    .filter(item => item.text.length > 0 || ['input', 'button', 'link'].includes(item.role))
    // Sort: In Viewport first, then by vertical position (y)
    .sort((a, b) => {
      if (a.in_viewport && !b.in_viewport) return -1;
      if (!a.in_viewport && b.in_viewport) return 1;
      return a.y - b.y;
    });

  return {
    title: document.title,
    url: window.location.href,
    elements: distilledElements
  };
};

// Add Aura specific styles for adaptations
const style = document.createElement('style');
style.id = 'aura-adaptation-styles';
style.textContent = `
  .aura-highlight-active {
    outline: 5px solid #6366f1 !important;
    outline-offset: 4px !important;
    transition: outline 0.3s ease-in-out !important;
    position: relative !important;
    z-index: 10000 !important;
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
`;
document.head.appendChild(style);

// Listen for messages from the Popup/Sidecar
chrome.runtime.onMessage.addListener(
  (
    request: { action: string; selector?: string; adaptations?: any },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ) => {
    console.log("Content script received message:", request.action);
    
    if (request.action === "GET_DOM") {
      try {
        const data = scrapePage();
        console.log("Page scraped successfully, elements found:", data.elements.length);
        sendResponse(data);
      } catch (err) {
        console.error("Scraping failed:", err);
        sendResponse({ error: "Scraping failed", details: String(err) });
      }
    } else if (request.action === "HIGHLIGHT" && request.selector) {
      try {
        const el = document.querySelector(request.selector) as HTMLElement;
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("aura-highlight-active");
          setTimeout(() => {
            el.classList.remove("aura-highlight-active");
          }, 5000);
          sendResponse({ success: true });
        } else {
          sendResponse({ error: "Element not found" });
        }
      } catch (err) {
        sendResponse({ error: "Highlight failed", details: String(err) });
      }
    } else if (request.action === "ADAPT_UI" && request.adaptations) {
        console.log("Aura: Applying UI adaptations:", request.adaptations);
        const { hide_elements, highlight_elements, layout_mode } = request.adaptations;

        // Reset previous adaptations
        document.querySelectorAll(".aura-highlight-active").forEach(el => el.classList.remove("aura-highlight-active"));
        document.body.classList.remove("aura-focus-mode", "aura-simplified-mode");
        document.querySelectorAll("[data-aura-hidden]").forEach(el => (el as HTMLElement).removeAttribute("data-aura-hidden"));
        document.querySelectorAll(".aura-dimmed").forEach(el => el.classList.remove("aura-dimmed"));

        // Apply hiding
        hide_elements?.forEach((selector: string) => {
            const el = document.querySelector(selector);
            if (el) (el as HTMLElement).setAttribute("data-aura-hidden", "true");
        });

        // Apply highlighting
        highlight_elements?.forEach((selector: string) => {
            const el = document.querySelector(selector);
            if (el) el.classList.add("aura-highlight-active");
        });

        // Apply layout modes
        if (layout_mode === "focus") {
            document.body.classList.add("aura-focus-mode");
            // Dim everything except highlighted or essential elements
            document.querySelectorAll("body > *:not(script):not(style)").forEach(el => {
                const hasHighlight = el.querySelector(".aura-highlight-active") || el.classList.contains("aura-highlight-active");
                if (!hasHighlight) {
                    el.classList.add("aura-dimmed");
                }
            });
        } else if (layout_mode === "simplified") {
            document.body.classList.add("aura-simplified-mode");
        }

        sendResponse({ success: true, status: "adapted" });
    } else if (request.action === "RESET_UI") {
        console.log("Aura: Resetting UI adaptations...");
        document.querySelectorAll(".aura-highlight-active").forEach(el => el.classList.remove("aura-highlight-active"));
        document.body.classList.remove("aura-focus-mode", "aura-simplified-mode");
        document.querySelectorAll("[data-aura-hidden]").forEach(el => (el as HTMLElement).removeAttribute("data-aura-hidden"));
        document.querySelectorAll(".aura-dimmed").forEach(el => el.classList.remove("aura-dimmed"));
        sendResponse({ success: true, status: "reset" });
    }
    return true;
  }
);

const initializePrefetchListeners = () => {
  let hoverTimer: number | undefined;
  const PREFETCH_DELAY = 750; // ms

  document.addEventListener('mouseover', (event) => {
    const target = event.target as HTMLElement;
    const link = target.closest('a');

    if (link && link.href) {
      hoverTimer = window.setTimeout(() => {
        // Ensure the URL is valid and not a local anchor
        if (link.href.startsWith('http')) {
            console.log(`Prefetching: ${link.href}`);
            chrome.runtime.sendMessage({ type: "PREFETCH_URL", url: link.href }).catch(() => {
              // Ignore errors if background script is temporarily unavailable
            });
        }
      }, PREFETCH_DELAY);
    }
  });

  document.addEventListener('mouseout', (event) => {
    const target = event.target as HTMLElement;
    const link = target.closest('a');
    if (link) {
      clearTimeout(hoverTimer);
    }
  });
};

initializePrefetchListeners();

const STRUGGLE_THRESHOLD = 3; // Repetitive clicks on non-interactive area
let clickCounter = 0;
let lastClickTime = 0;

document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const isInteractive = target.closest('button, a, input, [role="button"]');
    
    const now = Date.now();
    if (!isInteractive) {
        if (now - lastClickTime < 2000) { // Clicks within 2 seconds
            clickCounter++;
        } else {
            clickCounter = 1;
        }
        
        if (clickCounter >= STRUGGLE_THRESHOLD) {
            console.log("User struggle detected (repetitive clicks). Notifying Aura...");
            chrome.runtime.sendMessage({ type: "STRUGGLE_DETECTED", detail: "repetitive_clicks" });
            clickCounter = 0; // Reset
        }
    } else {
        clickCounter = 0; // Reset on successful interaction
    }
    lastClickTime = now;
});

console.log("Aura Content Script (Bridge) Initialized and Ready");
