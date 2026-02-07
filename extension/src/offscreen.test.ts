import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as offscreenModule from './offscreen';

describe('offscreen.ts', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Setup standard mock for constructor
    // @ts-ignore
    (globalThis as any).SpeechRecognition = vi.fn().mockImplementation(function(this: any) {
        this.start = vi.fn();
        this.stop = vi.fn();
        this.onresult = null;
        this.onend = null;
        this.onerror = null;
        return this;
    });
    // @ts-ignore
    (globalThis as any).webkitSpeechRecognition = undefined;
    
    await import('./offscreen?update=' + Date.now());
  });

  it('starts wake word listener on message', () => {
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls.find(call => typeof call[0] === 'function')?.[0];
    if (!listener) throw new Error("Listener not found");

    listener({ target: 'offscreen', type: 'start_capture' }, {} as chrome.runtime.MessageSender, vi.fn());
    expect((globalThis as any).SpeechRecognition).toHaveBeenCalled();
  });

  it('stops wake word listener on message', () => {
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls.find(call => typeof call[0] === 'function')?.[0];
    if (!listener) throw new Error("Listener not found");

    listener({ target: 'offscreen', type: 'start_capture' }, {} as chrome.runtime.MessageSender, vi.fn());
    listener({ target: 'offscreen', type: 'stop_capture' }, {} as chrome.runtime.MessageSender, vi.fn());
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ status: 'stopped' }));
  });

  it('factory create returns null when no API exists', () => {
    const oldSR = (globalThis as any).SpeechRecognition;
    // @ts-ignore
    (globalThis as any).SpeechRecognition = undefined;
    // @ts-ignore
    (globalThis as any).webkitSpeechRecognition = undefined;
    expect(offscreenModule._recognitionFactory.create()).toBeNull();
    // @ts-ignore
    (globalThis as any).SpeechRecognition = oldSR;
  });

  it('factory create returns instance when API exists', () => {
    expect(offscreenModule._recognitionFactory.create()).toBeDefined();
  });
});
