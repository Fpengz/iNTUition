/**
 * Aura Content Script
 * Responsibility: Scrape the page for accessible elements and handle highlights.
 */

export const scrapePage = () => {
  const elements = document.querySelectorAll('button, a, input, h1, h2, h3, [role="button"]');
  const distilledElements = Array.from(elements).map((el, index) => {
    // Assign a temporary ID for tracking
    const auraId = `aura-el-${index}`;
    el.setAttribute('data-aura-id', auraId);

    return {
      role: el.tagName.toLowerCase() === 'a' ? 'link' : el.getAttribute('role') || el.tagName.toLowerCase(),
      text: el.textContent?.trim() || (el as HTMLInputElement).placeholder || el.getAttribute('aria-label') || '',
      selector: `[data-aura-id="${auraId}"]`,
      aria_label: el.getAttribute('aria-label')
    };
  });

  return {
    title: document.title,
    url: window.location.href,
    elements: distilledElements
  };
};

// Listen for messages from the Popup/Sidecar
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "GET_DOM") {
    sendResponse(scrapePage());
  } else if (request.action === "HIGHLIGHT") {
    const el = document.querySelector(request.selector) as HTMLElement;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.outline = '5px solid #BD34FE';
      el.style.outlineOffset = '5px';
      setTimeout(() => {
        el.style.outline = '';
      }, 3000);
    }
  }
  return true;
});

console.log("Aura Bridge Active");
