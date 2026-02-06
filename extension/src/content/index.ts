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
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    position: relative !important;
    z-index: 10000 !important;
    transform: scale(1.05); /* Default slight scale for visibility */
  }

  .aura-upscaled {
    transform: scale(1.25) !important;
    z-index: 10001 !important;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
    cursor: pointer !important;
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

  /* Tooltip for Semantic Annotation */
  .aura-annotation-tooltip {
      position: absolute;
      background: #1e293b;
      color: white;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      font-size: 0.75rem;
      z-index: 10002;
      pointer-events: none;
      max-width: 200px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      margin-top: 8px;
  }
`;
document.head.appendChild(style);

  /* Focus Portal - Phase B */
  #aura-focus-portal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(255, 255, 255, 0.98);
      z-index: 20000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      backdrop-filter: blur(10px);
      display: none; /* Hidden by default */
  }

  .portal-content {
      max-width: 600px;
      width: 100%;
      text-align: center;
      animation: aura-slide-up 0.4s ease-out;
  }

  .portal-explanation {
      font-size: 1.5rem;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 2rem;
      line-height: 1.4;
  }

  .portal-actions {
      display: flex;
      flex-direction: column;
      gap: 1rem;
  }

  .portal-btn {
      background: #6366f1;
      color: white;
      border: none;
      padding: 1.25rem;
      border-radius: 12px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, background 0.2s;
      box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.4);
  }

  .portal-btn:hover {
      background: #4f46e5;
      transform: translateY(-2px);
  }

  .portal-exit {
      margin-top: 3rem;
      background: transparent;
      border: 1px solid #cbd5e1;
      color: #64748b;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      cursor: pointer;
  }

  @keyframes aura-slide-up {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
  }
`;
document.head.appendChild(style);

// Create the Portal element once
const portal = document.createElement("div");
portal.id = "aura-focus-portal";
portal.innerHTML = `
    <div class="portal-content">
        <div id="aura-portal-explanation" class="portal-explanation"></div>
        <div id="aura-portal-actions" class="portal-actions"></div>
        <button class="portal-exit" id="aura-portal-exit">Back to Full Page</button>
    </div>
`;
document.body.appendChild(portal);

document.getElementById("aura-portal-exit")?.addEventListener("click", () => {
    portal.style.display = "none";
});

// Listen for messages from the Popup/Sidecar
chrome.runtime.onMessage.addListener(
  (
    request: { action: string; selector?: string; adaptations?: any; explanation?: string; main_actions?: string[] },
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
        const { hide_elements, highlight_elements, layout_mode, explanation } = request.adaptations;

        // Reset previous adaptations
        document.querySelectorAll(".aura-highlight-active").forEach(el => el.classList.remove("aura-highlight-active"));
        document.querySelectorAll(".aura-upscaled").forEach(el => el.classList.remove("aura-upscaled"));
        document.querySelectorAll(".aura-annotation-tooltip").forEach(el => el.remove());
        document.body.classList.remove("aura-focus-mode", "aura-simplified-mode");
        document.querySelectorAll("[data-aura-hidden]").forEach(el => (el as HTMLElement).removeAttribute("data-aura-hidden"));
        document.querySelectorAll(".aura-dimmed").forEach(el => el.classList.remove("aura-dimmed"));
        portal.style.display = "none";

        // Apply Focus Portal (Option 3: Semantic Overlay)
        if (layout_mode === "focus") {
            const explanationEl = document.getElementById("aura-portal-explanation");
            const actionsEl = document.getElementById("aura-portal-actions");
            
            if (explanationEl && actionsEl) {
                explanationEl.textContent = explanation || "Aura has simplified this page for you.";
                actionsEl.innerHTML = ""; // Clear actions
                
                // Populate the Portal with actual buttons linking to original DOM
                highlight_elements?.forEach((selector: string) => {
                    const originalEl = document.querySelector(selector) as HTMLElement;
                    if (originalEl) {
                        const btn = document.createElement("button");
                        btn.className = "portal-btn";
                        btn.textContent = originalEl.textContent?.trim() || "Complete Action";
                        btn.onclick = () => {
                            portal.style.display = "none";
                            originalEl.scrollIntoView({ behavior: "smooth", block: "center" });
                            originalEl.click();
                            // Visual feedback on original
                            originalEl.classList.add("aura-highlight-active");
                            setTimeout(() => originalEl.classList.remove("aura-highlight-active"), 2000);
                        };
                        actionsEl.appendChild(btn);
                    }
                });
                
                portal.style.display = "flex";
                sendResponse({ success: true, status: "focus_portal_active" });
                return;
            }
        }

        // Apply hiding (Option 2: Simplification)
        hide_elements?.forEach((selector: string) => {
            const el = document.querySelector(selector);
            if (el) (el as HTMLElement).setAttribute("data-aura-hidden", "true");
        });

        // Apply highlighting and upscaling (Option 2: Motor/Visual Guidance)
        highlight_elements?.forEach((selector: string) => {
            const el = document.querySelector(selector) as HTMLElement;
            if (el) {
                el.classList.add("aura-highlight-active");
                el.classList.add("aura-upscaled");
                
                const tooltip = document.createElement("div");
                tooltip.className = "aura-annotation-tooltip";
                tooltip.textContent = "Recommended Action";
                document.body.appendChild(tooltip);
                
                const rect = el.getBoundingClientRect();
                tooltip.style.left = `${rect.left + window.scrollX}px`;
                tooltip.style.top = `${rect.bottom + window.scrollY}px`;
            }
        });

        if (layout_mode === "simplified") {
            document.body.classList.add("aura-simplified-mode");
        }

        sendResponse({ success: true, status: "adapted" });
    } else if (request.action === "RESET_UI") {
        console.log("Aura: Resetting UI adaptations...");
        document.querySelectorAll(".aura-highlight-active").forEach(el => el.classList.remove("aura-highlight-active"));
        document.querySelectorAll(".aura-upscaled").forEach(el => el.classList.remove("aura-upscaled"));
        document.querySelectorAll(".aura-annotation-tooltip").forEach(el => el.remove());
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
