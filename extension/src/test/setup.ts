import { vi } from 'vitest';

global.chrome = {
  runtime: {
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    sendMessage: vi.fn(),
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
  },
  sidePanel: {
      setPanelBehavior: vi.fn(),
      open: vi.fn(),
  }
} as any;

// Mock IntersectionObserver
class MockIntersectionObserver {
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
}

global.IntersectionObserver = MockIntersectionObserver as any;
