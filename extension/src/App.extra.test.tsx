import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import App from './App';

describe('App Extra', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (chrome.tabs.query as any).mockResolvedValue([{ id: 1, url: 'http://test.com' }]);
    (chrome.tabs.sendMessage as any).mockResolvedValue({ title: 'Test' });
  });

  it('renders Aura and toggles settings', async () => {
    render(<App />);
    expect(screen.getByText('Aura')).toBeDefined();
    
    const settingsBtn = screen.getByLabelText('Settings');
    await act(async () => {
        settingsBtn.click();
    });
    expect(screen.getByText('Accessibility Identity')).toBeDefined();
  });

  it('shows struggle detection banner', async () => {
    (chrome.storage.local.get as any).mockImplementation((_keys: any, cb: (arg: any) => void) => {
        cb({ auraProactiveHelpTriggered: true });
    });

    render(<App />);
    
    // Banner should be visible
    expect(screen.getByText(/Struggling\?/)).toBeDefined();
  });
});