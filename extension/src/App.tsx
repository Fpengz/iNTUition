import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import AuraCardDisplay from './components/AuraCardDisplay';
import { SpeechRecognitionService } from './services/speechRecognition'; // Import SpeechRecognitionService

interface CardData {
  summary: string;
  actions: string[];
}

const WAKE_WORD = "hey aura"; // Define wake word

function App() {
  const [cardData, setCardData] = useState<CardData>({ summary: '', actions: [] });
  const [domData, setDomData] = useState<any>(null);
  const [processTime, setProcessTime] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [userProfile, setUserProfile] = useState({ cognitive_needs: true, language_level: 'simple' });

  // Load profile on mount
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get('auraUserProfile', (result) => {
            if (result.auraUserProfile) {
                setUserProfile(result.auraUserProfile);
            }
        });
    }
  }, []);

  // Save profile on change
  const handleProfileChange = (key: string, value: any) => {
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
  }, [userProfile]); // Re-create if userProfile changes

  // Use a ref to store handleExplain to allow useEffect to access its latest version
  const handleExplainRef = useRef(handleExplain);
  useEffect(() => {
    handleExplainRef.current = handleExplain;
  }, [handleExplain]); // Update ref whenever handleExplain changes

  // Start Offscreen Capture for Wake Word on Mount
  useEffect(() => {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage({ type: 'start_av_capture' });
      }
  }, []);

  // Listen for wake word trigger from background (via storage)
  useEffect(() => {
    const checkTrigger = () => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get('auraWakeWordTriggered', (result) => {
                if (result.auraWakeWordTriggered) {
                    console.log("Wake word trigger detected in storage.");
                    chrome.storage.local.remove('auraWakeWordTriggered');
                    handleExplainRef.current();
                }
            });
        }
    };

    // Check on mount
    checkTrigger();

    // Listen for changes
    const handleStorageChange = (changes: any, area: string) => {
        if (area === 'local' && changes.auraWakeWordTriggered?.newValue) {
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
  }, []);

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
        } else {
            console.warn("No selector found for action:", action);
        }
    } catch (e) {
        console.error("Action mapping failed:", e);
    }
  };

  return (
    <div className="aura-container" style={{ width: '100%', height: '100vh', padding: '1rem', boxSizing: 'border-box', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>Aura</h1>
        <button 
            onClick={() => setShowSettings(!showSettings)}
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
        >
            {showSettings ? 'Close' : 'Settings'}
        </button>
      </div>

      {showSettings ? (
          <div className="settings-panel" style={{ background: '#f9f9f9', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', textAlign: 'left' }}>
              <h3 style={{ marginTop: 0, color: '#333' }}>Accessibility Profile</h3>
              
              <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: '#333' }}>
                      <input 
                        type="checkbox" 
                        checked={userProfile.cognitive_needs} 
                        onChange={(e) => handleProfileChange('cognitive_needs', e.target.checked)}
                        style={{ marginRight: '0.5rem' }}
                      />
                      Reduce Cognitive Load
                  </label>
                  <small style={{ color: '#666', display: 'block', marginLeft: '1.5rem', marginTop: '0.25rem' }}>Simplifies summaries and focuses on essential actions.</small>
              </div>

              <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333' }}>Language Level:</label>
                  <select 
                    value={userProfile.language_level}
                    onChange={(e) => handleProfileChange('language_level', e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                  >
                      <option value="simple">Simple</option>
                      <option value="detailed">Detailed</option>
                  </select>
              </div>
          </div>
      ) : (
        <>
            <button onClick={() => handleExplain()} disabled={loading} style={{width: '100%'}}>
                {loading ? 'Thinking...' : 'Explain this Page'}
            </button>

            {error && <p style={{ color: 'red' }}>{error}</p>}
            
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
    </div>
  );
}

export default App;