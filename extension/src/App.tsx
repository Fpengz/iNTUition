import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import AuraCardDisplay from './components/AuraCardDisplay';

interface CardData {
  summary: string;
  actions: string[];
}

interface UserProfile {
  cognitive_needs: boolean;
  language_level: string;
}

function App() {
  const [cardData, setCardData] = useState<CardData>({ summary: '', actions: [] });
  const [domData, setDomData] = useState<any>(null);
  const [processTime, setProcessTime] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({ cognitive_needs: true, language_level: 'simple' });
  const [proactivePrompt, setProactivePrompt] = useState(false);

  // Load profile on mount
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get('auraUserProfile', (result) => {
            if (result.auraUserProfile) {
                setUserProfile(result.auraUserProfile as UserProfile);
            }
        });
    }
  }, []);

  // Save profile on change
  const handleProfileChange = (key: keyof UserProfile, value: any) => {
      const newProfile = { ...userProfile, [key]: value };
      setUserProfile(newProfile);
      if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.set({ auraUserProfile: newProfile });
      }
  };

  // Define handleExplain using useCallback to stabilize its reference
  const handleExplain = useCallback(async () => {
    setLoading(true);
    setError('');
    setCardData({ summary: '', actions: [] });
    setProcessTime('');
    setShowSettings(false);
    setProactivePrompt(false);

    try {
      if (typeof chrome === 'undefined' || !chrome.tabs) {
        throw new Error("Aura must be run as a Chrome Extension.");
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        console.error("No active tab found in current window.");
        throw new Error("Could not find active tab.");
      }

      console.log("Sending GET_DOM to tab:", tab.id);
      let scrapedData;
      try {
        scrapedData = await chrome.tabs.sendMessage(tab.id, { action: "GET_DOM" });
      } catch (sendErr: any) {
        console.error("Error sending message to content script:", sendErr);
        if (sendErr.message.includes("Extension context invalidated")) {
          throw new Error("Extension updated. Please refresh the web page to continue.");
        }
        throw new Error("Content script not responding. Please refresh the page or try a different site.");
      }

      if (scrapedData?.error) {
        throw new Error(`Scraping error: ${scrapedData.error}`);
      }

      if (!scrapedData) throw new Error("Content script returned empty data.");
      
      setDomData(scrapedData);

      console.log("DOM data received, calling backend...");
      const payload = { dom_data: scrapedData, profile: userProfile };
      
      const response = await fetch('http://127.0.0.1:8000/explain/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const timeHeader = response.headers.get('X-Process-Time');
      if (timeHeader) {
          setProcessTime(timeHeader);
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Backend error response:", errorText);
        throw new Error(`Backend error (${response.status}): ${errorText.slice(0, 100)}`);
      }

      if (!response.body) {
        throw new Error("Response has no body.");
      }

      setLoading(false); // Stop loading once stream starts
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        // The stream sends data in the format "data: {...}\n\n"
        // We need to parse this
        const lines = value.split('\n\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.substring(6);
            if (jsonStr) {
              const data = JSON.parse(jsonStr);
              if (data.type === 'summary') {
                setCardData(prev => ({ ...prev, summary: prev.summary + data.content }));
              } else if (data.type === 'action') {
                setCardData(prev => ({ ...prev, actions: [...prev.actions, data.content] }));
              } else if (data.type === 'error') {
                throw new Error(data.content);
              }
            }
          }
        }
      }

    } catch (err: any) {
      console.error("Aura Full Error:", err);
      setError(err.message || "An unknown error occurred.");
      setLoading(false);
    }
  }, [userProfile]);

  const handleExplainRef = useRef(handleExplain);
  useEffect(() => {
    handleExplainRef.current = handleExplain;
  }, [handleExplain]);

  useEffect(() => {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage({ type: 'start_av_capture' });
      }
  }, []);

  useEffect(() => {
    const checkTrigger = () => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get(['auraWakeWordTriggered', 'auraProactiveHelpTriggered'], (result) => {
                if (result.auraWakeWordTriggered) {
                    console.log("Wake word trigger detected in storage.");
                    chrome.storage.local.remove('auraWakeWordTriggered');
                    handleExplainRef.current();
                }
                if (result.auraProactiveHelpTriggered && !loading && !cardData.summary) {
                    console.log("Proactive help trigger detected.");
                    chrome.storage.local.remove('auraProactiveHelpTriggered');
                    setProactivePrompt(true);
                }
            });
        }
    };

    checkTrigger();

    const handleStorageChange = (changes: any, area: string) => {
        if (area === 'local' && (changes.auraWakeWordTriggered?.newValue || changes.auraProactiveHelpTriggered?.newValue)) {
            checkTrigger();
        }
    };

    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.onChanged.addListener(handleStorageChange);
    }

    return () => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.onChanged.removeListener(handleStorageChange);
        }
    };
  }, [loading, cardData.summary]);

  const handleTTS = async (text: string) => {
    try {
        const response = await fetch('http://127.0.0.1:8000/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });
        if (!response.ok) throw new Error("Failed to fetch audio.");

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
    } catch (err: any) {
        setError(`TTS Error: ${err.message}`);
    }
  };

  const handleActionClick = async (action: string) => {
    if (!domData) return;
    try {
        const response = await fetch('http://127.0.0.1:8000/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dom_data: domData, query: action })
        });
        const result = await response.json();
        
        if (result.selector) {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id) {
                chrome.tabs.sendMessage(tab.id, { action: "HIGHLIGHT", selector: result.selector });
            }
        }
    } catch (e) {
        console.error("Action mapping failed:", e);
    }
  };

  return (
    <main className="aura-container">
      <header className="aura-header">
        <h1>Aura</h1>
        <button 
            className="btn-secondary"
            onClick={() => setShowSettings(!showSettings)}
            aria-expanded={showSettings}
            aria-label="Settings"
        >
            {showSettings ? 'Close' : 'Settings'}
        </button>
      </header>

      {showSettings ? (
          <section className="settings-panel" aria-labelledby="settings-title">
              <h3 id="settings-title">Accessibility Profile</h3>
              
              <div className="setting-item">
                  <label>
                      <input 
                        type="checkbox" 
                        checked={userProfile.cognitive_needs} 
                        onChange={(e) => handleProfileChange('cognitive_needs', e.target.checked)}
                      />
                      Reduce Cognitive Load
                  </label>
                  <span className="setting-description">Simplifies summaries and focuses on essential actions.</span>
              </div>

              <div className="setting-item">
                  <label htmlFor="lang-level">Language Level:</label>
                  <select 
                    id="lang-level"
                    value={userProfile.language_level}
                    onChange={(e) => handleProfileChange('language_level', e.target.value)}
                  >
                      <option value="simple">Simple</option>
                      <option value="detailed">Detailed</option>
                  </select>
              </div>
          </section>
      ) : (
        <>
            {proactivePrompt && (
                <div className="proactive-banner" style={{ background: '#fff0ff', padding: '1rem', borderRadius: '8px', border: '1px solid var(--aura-primary)', marginBottom: '1rem', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 0.75rem 0', fontWeight: '600' }}>Struggling? Aura is here to help.</p>
                    <button className="btn-primary" onClick={() => handleExplain()}>Explain Page</button>
                    <button className="btn-secondary" style={{ marginTop: '0.5rem', width: '100%' }} onClick={() => setProactivePrompt(false)}>Dismiss</button>
                </div>
            )}

            <button 
                className="btn-primary"
                onClick={() => handleExplain()} 
                disabled={loading}
            >
                {loading ? 'Thinking...' : 'Explain this Page'}
            </button>

            {error && <div className="error-message" role="alert">{error}</div>}
            
            {!loading && cardData.summary && (
                <div className="explanation-box" style={{ marginTop: '1rem' }}>
                    <AuraCardDisplay 
                        summary={cardData.summary}
                        actions={cardData.actions}
                        processTime={processTime}
                        onTTSClick={handleTTS}
                        onActionClick={handleActionClick}
                    />
                </div>
            )}
        </>
      )}
    </main>
  );
}

export default App;