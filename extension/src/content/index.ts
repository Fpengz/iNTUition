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

// Listen for messages from the Popup/Sidecar
chrome.runtime.onMessage.addListener(
  (
    request: { action: string; selector?: string },
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
          el.style.outline = "5px solid #BD34FE";
          el.style.outlineOffset = "5px";
          setTimeout(() => {
            el.style.outline = "";
          }, 3000);
          sendResponse({ success: true });
        } else {
          sendResponse({ error: "Element not found" });
        }
      } catch (err) {
        sendResponse({ error: "Highlight failed", details: String(err) });
      }
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
console.log("Aura Content Script (Bridge) Initialized and Ready");
