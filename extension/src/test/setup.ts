import { vi } from 'vitest';

// Mock SpeechRecognition
const MockSpeechRecognition = vi.fn().mockImplementation(() => ({
    continuous: false,
    interimResults: false,
    lang: 'en-US',
    onresult: null,
    onend: null,
    onerror: null,
    start: vi.fn(),
    stop: vi.fn(),
}));

(globalThis as any).chrome = {
  runtime: {
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    onInstalled: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    sendMessage: vi.fn().mockResolvedValue(undefined),
    getURL: vi.fn((path) => `chrome-extension://id/${path}`),
    getContexts: vi.fn().mockResolvedValue([]),
    lastError: undefined,
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
    onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
    }
  },
  tabs: {
      query: vi.fn(),
      sendMessage: vi.fn(),
      create: vi.fn(),
      captureVisibleTab: vi.fn(),
  },
  windows: {
      WINDOW_ID_CURRENT: -2
  },
  sidePanel: {
      setPanelBehavior: vi.fn().mockResolvedValue(undefined),
      open: vi.fn().mockResolvedValue(undefined),
  },
  offscreen: {
      createDocument: vi.fn().mockResolvedValue(undefined),
      hasDocument: vi.fn().mockResolvedValue(false),
      closeDocument: vi.fn().mockResolvedValue(undefined),
      Reason: {
          USER_MEDIA: 'AUDIO_VIDEO'
      }
  }
} as any;

// Mock IntersectionObserver
class MockIntersectionObserver {
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
}

(globalThis as any).IntersectionObserver = MockIntersectionObserver as any;
(globalThis as any).window.HTMLElement.prototype.scrollIntoView = vi.fn();

(globalThis as any).window.SpeechRecognition = MockSpeechRecognition as any;
(globalThis as any).window.webkitSpeechRecognition = MockSpeechRecognition as any;
(globalThis as any).SpeechRecognition = MockSpeechRecognition as any;
(globalThis as any).webkitSpeechRecognition = MockSpeechRecognition as any;
