import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to mock fetch globally for background.ts
(globalThis as any).fetch = vi.fn();

describe('background.ts', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    (chrome.runtime as any).lastError = undefined;
    // Reset the module to re-run listeners
    await import('../src/background?update=' + Date.now());
  });

  it('handles onInstalled with install reason', () => {
    const listener = vi.mocked(chrome.runtime.onInstalled.addListener).mock.calls[0][0];
    listener({ reason: 'install' });
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'setup.html' });
  });

  it('handles onInstalled with non-install reason', () => {
    const listener = vi.mocked(chrome.runtime.onInstalled.addListener).mock.calls[0][0];
    listener({ reason: 'update' });
    expect(chrome.tabs.create).not.toHaveBeenCalled();
  });

  it('should handle PREFETCH_URL message', async () => {
    const mockUrl = 'http://example.com';
    const message = { type: 'PREFETCH_URL', url: mockUrl };
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0];
    
    ((globalThis as any).fetch as any).mockResolvedValue({
      json: () => Promise.resolve({ status: 'ok' })
    });

    listener(message, {} as chrome.runtime.MessageSender, vi.fn());

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/prefetch'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ url: mockUrl })
      })
    );
  });

  it('should handle PREFETCH_URL failure', async () => {
    const mockUrl = 'http://example.com';
    const message = { type: 'PREFETCH_URL', url: mockUrl };
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0];
    
    ((globalThis as any).fetch as any).mockRejectedValue(new Error('Network Fail'));

    listener(message, {} as chrome.runtime.MessageSender, vi.fn());
  });

  it('should handle CAPTURE_SCREENSHOT message', () => {
    const message = { type: 'CAPTURE_SCREENSHOT' };
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0];
    const sendResponse = vi.fn();
    
    // @ts-ignore
    chrome.tabs.captureVisibleTab.mockImplementation((_winId, _opts, cb) => {
        cb('dataUrl');
    });

    const mockSender = { 
        tab: { 
            windowId: 1, 
            index: 0, 
            pinned: false, 
            highlighted: false, 
            active: true, 
            incognito: false, 
            selected: true, 
            discarded: false, 
            autoDiscardable: true 
        } 
    } as any;

    listener(message, mockSender, sendResponse);
    expect(sendResponse).toHaveBeenCalledWith({ dataUrl: 'dataUrl' });
  });

  it('should handle CAPTURE_SCREENSHOT error', () => {
    const message = { type: 'CAPTURE_SCREENSHOT' };
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0];
    const sendResponse = vi.fn();
    
    (chrome.runtime as any).lastError = { message: 'Capture Fail' };
    // @ts-ignore
    chrome.tabs.captureVisibleTab.mockImplementation((_winId, _opts, cb) => {
        cb(undefined);
    });

    listener(message, {} as chrome.runtime.MessageSender, sendResponse);
    expect(sendResponse).toHaveBeenCalledWith({ error: 'Capture Fail' });
  });

  it('should handle start_av_capture message', async () => {
    const message = { type: 'start_av_capture' };
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0];
    
    // Mock getContexts to return empty
    // @ts-ignore
    chrome.runtime.getContexts = vi.fn().mockResolvedValue([]);

    await listener(message, {} as chrome.runtime.MessageSender, vi.fn());
    expect(chrome.offscreen.createDocument).toHaveBeenCalled();
  });

  it('should handle start_av_capture message with existing document', async () => {
    const message = { type: 'start_av_capture' };
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0];
    
    // Mock getContexts to return existing document
    // @ts-ignore
    chrome.runtime.getContexts = vi.fn().mockResolvedValue([{ id: 'existing' }]);
    
    await listener(message, {} as chrome.runtime.MessageSender, vi.fn());
    // Should NOT call createDocument
    expect(chrome.offscreen.createDocument).not.toHaveBeenCalled();
  });

  it('should handle start_av_capture error', async () => {
    const message = { type: 'start_av_capture' };
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0];
    
    // Trigger error in contexts
    // @ts-ignore
    chrome.runtime.getContexts = vi.fn().mockRejectedValue(new Error('Context Error'));

    await listener(message, {} as chrome.runtime.MessageSender, vi.fn());
  });

  it('should handle stop_av_capture message', async () => {
    const message = { type: 'stop_av_capture' };
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0];
    
    // @ts-ignore
    chrome.runtime.getContexts = vi.fn().mockResolvedValue([]);

    await listener(message, {} as chrome.runtime.MessageSender, vi.fn());
    // Small delay for IIFE
    await new Promise(r => setTimeout(r, 10));
    expect(vi.mocked(chrome.runtime.sendMessage)).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'stop_capture' })
    );
  });

  it('should handle stop_av_capture error', async () => {
    const message = { type: 'stop_av_capture' };
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0];
    
    // @ts-ignore
    chrome.runtime.getContexts = vi.fn().mockRejectedValue(new Error('Stop Error'));

    await listener(message, {} as chrome.runtime.MessageSender, vi.fn());
  });

  it('should handle capture_status message', () => {
    const message = { type: 'capture_status', status: 'started' };
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0];
    const res = listener(message, {} as chrome.runtime.MessageSender, vi.fn());
    expect(res).toBe(false);
  });

  it('should handle WAKE_WORD_DETECTED message', () => {
    const message = { type: 'WAKE_WORD_DETECTED' };
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0];
    
    // @ts-ignore
    chrome.tabs.query.mockImplementation((_opts, cb) => {
        cb([{ windowId: 123 }]);
    });

    listener(message, {} as chrome.runtime.MessageSender, vi.fn());

    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({ auraWakeWordTriggered: true })
    );
  });

  it('should handle STRUGGLE_DETECTED message', () => {
    const message = { type: 'STRUGGLE_DETECTED' };
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0];
    
    listener(message, {} as chrome.runtime.MessageSender, vi.fn());

    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({ auraProactiveHelpTriggered: true })
    );
  });
});