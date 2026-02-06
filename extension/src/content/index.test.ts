import { describe, it, expect, beforeEach, vi } from 'vitest';
import { scrapePage } from './index';

describe('Aura Content Script', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    
    // Default mock for getBoundingClientRect to ensure elements are "visible"
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function(this: Element) {
         return {
            width: 100,
            height: 100,
            top: 0,
            left: 0,
            bottom: 100,
            right: 100,
            x: 0,
            y: 0,
            toJSON: () => {}
        };
    });
  });

  it('should scrape headings and paragraphs correctly', () => {
    document.body.innerHTML = `
      <main id="content">
        <h1>Welcome to Aura</h1>
        <p>This is a test paragraph.</p>
        <button aria-label="Click me">Button</button>
      </main>
    `;

    const result = scrapePage();

    expect(result.title).toBeDefined();
    expect(result.elements.length).toBeGreaterThan(0);
    
    const button = result.elements.find(el => el.role === 'button');
    expect(button).toBeDefined();
    expect(button?.aria_label).toBe('Click me');
    
    expect(result.main_selector).toBe('#content');
  });

  it('should generate unique aura-ids', () => {
    document.body.innerHTML = `
      <button>One</button>
      <button>Two</button>
    `;

    const result = scrapePage();
    const ids = result.elements.map(el => el.selector);
    const uniqueIds = new Set(ids);
    
    expect(uniqueIds.size).toBe(2);
  });

  it('should filter out invisible elements', () => {
    document.body.innerHTML = `
      <button style="display: none">Hidden</button>
      <button style="visibility: hidden">Invisible</button>
      <button>Visible</button>
    `;

    // Mock getComputedStyle
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element) => {
      const style = new CSSStyleDeclaration();
      if (el.innerHTML === 'Hidden') style.display = 'none';
      if (el.innerHTML === 'Invisible') style.visibility = 'hidden';
      return style;
    });
    
    // getBoundingClientRect is already mocked in beforeEach

    const result = scrapePage();
    // Note: In jsdom, getComputedStyle might behave differently or defaults.
    // Ideally we check if our filter logic works.
    // Since we mocked getComputedStyle above, it should work.
    
    const visibleButtons = result.elements.filter(el => el.role === 'button');
    // Expect 1 (Visible)
    // However, jsdom might not fully respect the mock in the way querySelectorAll works vs our loop.
    // But our loop uses window.getComputedStyle(el).
    
    expect(visibleButtons.length).toBe(1);
    expect(visibleButtons[0].text).toBe('Visible');
  });
});
