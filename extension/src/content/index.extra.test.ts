import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, act } from '@testing-library/react';
import { scrapePage } from './index';

describe('Content Script index.tsx', () => {
  beforeEach(async () => {
    document.body.innerHTML = `
      <main id="main">
        <button id="btn">Click</button>
        <a href="http://link.com">Link</a>
        <input type="text" placeholder="Input">
        <div data-aura-id="existing" role="button">Already processed</div>
      </main>
    `;
    // Mock getBoundingClientRect for JSDOM
    window.HTMLElement.prototype.getBoundingClientRect = function() {
        return {
            width: 100, height: 50, top: 0, left: 0, bottom: 50, right: 100, x: 0, y: 0, toJSON: () => {}
        } as DOMRect;
    };
    vi.clearAllMocks();
    // Force reload module to trigger listeners
    await act(async () => {
        await import('./index?update=' + Date.now());
    });
  });

  it('scrapes page correctly and handles edge cases', () => {
    const data = scrapePage();
    expect(data.title).toBeDefined();
    expect(data.elements.length).toBeGreaterThan(0);
    expect(data.elements.some(el => el.text === 'Already processed')).toBe(true);
  });

  it('handles messages via listener', async () => {
    const addListenerSpy = vi.mocked(chrome.runtime.onMessage.addListener);
    const listener = addListenerSpy.mock.calls.find(call => typeof call[0] === 'function')?.[0];
    
    if (!listener) throw new Error("Listener not found");

    // Test GET_DOM
    const sendResponse = vi.fn();
    listener({ action: 'GET_DOM' }, {} as chrome.runtime.MessageSender, sendResponse);
    expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({ title: expect.any(String) }));

    // Test HIGHLIGHT
    listener({ action: 'HIGHLIGHT', selector: '#btn' }, {} as chrome.runtime.MessageSender, vi.fn());
    expect(document.querySelector('#btn')?.classList.contains('aura-highlight-active')).toBe(true);

    // Test HIGHLIGHT error
    const sendResError = vi.fn();
    listener({ action: 'HIGHLIGHT', selector: '#nonexistent' }, {} as chrome.runtime.MessageSender, sendResError);
    expect(sendResError).toHaveBeenCalledWith({ error: 'Element not found' });

    // Test ADAPT_UI
    const adaptations = {
        hide_elements: ['#btn'],
        highlight_elements: ['a'],
        layout_mode: 'focus',
        apply_bionic: true,
        theme: 'dark'
    };
    listener({ action: 'ADAPT_UI', adaptations }, {} as chrome.runtime.MessageSender, vi.fn());
    expect(document.querySelector('#btn')?.getAttribute('data-aura-hidden')).toBe('true');
    expect(document.body.classList.contains('aura-focus-mode')).toBe(true);

    // Test RESET_UI
    listener({ action: 'RESET_UI' }, {} as chrome.runtime.MessageSender, vi.fn());
    expect(document.body.classList.contains('aura-focus-mode')).toBe(false);

    // Test SET_THEME
    listener({ action: 'SET_THEME', theme: 'dark' }, {} as chrome.runtime.MessageSender, vi.fn());
    expect(document.getElementById('aura-theme-dark')).toBeDefined();
  });

  it('applies bionic reading correctly', () => {
    document.body.innerHTML = '<p>This is a long paragraph that should be processed by bionic reading logic.</p>';
    const addListenerSpy = vi.mocked(chrome.runtime.onMessage.addListener);
    const listener = addListenerSpy.mock.calls.find(call => typeof call[0] === 'function')?.[0];
    if (listener) {
        listener({ action: 'ADAPT_UI', adaptations: { apply_bionic: true } }, {} as chrome.runtime.MessageSender, vi.fn());
        expect(document.body.innerHTML).toContain('<b>');
    }
  });

  it('handles bridge window messages', async () => {
    const postMessageSpy = vi.spyOn(window, 'postMessage');
    
    // AURA_GET_DOM
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'AURA_GET_DOM' } }));
    expect(postMessageSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'AURA_DOM_RESPONSE' }), '*');

    // AURA_ADAPT_UI
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'AURA_ADAPT_UI', adaptations: { reset: true } } }));
    
    // AURA_SET_THEME
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'AURA_SET_THEME', theme: 'contrast' } }));
    expect(document.getElementById('aura-theme-contrast')).toBeDefined();
  });

  it('handles struggle detection - rage clicks and resets', () => {
    vi.useFakeTimers();
    
    // Interactive click should not trigger
    const btn = document.querySelector('#btn')!;
    if (btn) {
        for(let i=0; i<10; i++) fireEvent.click(btn);
    }
    vi.advanceTimersByTime(2001);
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'STRUGGLE_DETECTED' }));

    // Rage click
    for(let i=0; i<6; i++) {
        fireEvent.click(document.body);
    }
    vi.advanceTimersByTime(2001);
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'STRUGGLE_DETECTED' }));
    vi.useRealTimers();
  });

  it('handles struggle detection - scroll looping', () => {
    vi.useFakeTimers();
    let y = 0;
    for(let i=0; i<10; i++) {
        y = (i % 2 === 0) ? 1000 : 0;
        window.scrollY = y;
        fireEvent.scroll(window);
    }
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'STRUGGLE_DETECTED' }));
    // Trigger reset timer
    vi.advanceTimersByTime(3001);
    vi.useRealTimers();
  });

  it('handles prefetch mouseover and mouseout', () => {
    vi.useFakeTimers();
    const link = document.querySelector('a')!;
    if (link) {
        fireEvent.mouseOver(link);
        vi.advanceTimersByTime(751);
        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'PREFETCH_URL' }));
        
        vi.mocked(chrome.runtime.sendMessage).mockClear();
        fireEvent.mouseOver(link);
        fireEvent.mouseOut(link);
        vi.advanceTimersByTime(751);
        expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    }
    vi.useRealTimers();
  });

  it('handles prefetch edge cases', () => {
    vi.useFakeTimers();
    // Non-http link
    const mailto = document.createElement('a');
    mailto.href = 'mailto:test@test.com';
    document.body.appendChild(mailto);
    fireEvent.mouseOver(mailto);
    vi.advanceTimersByTime(751);
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'PREFETCH_URL' }));
    vi.useRealTimers();
  });
});
