import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import AuraCardDisplay from './components/AuraCardDisplay';

interface CardData {
  summary: string;
  actions: string[];
}

interface CognitiveProfile {
  support_level: 'none' | 'low' | 'medium' | 'high';
  simplify_language: boolean;
  reduce_distractions: boolean;
  memory_aids: boolean;
}

interface MotorProfile {
  precision_required: 'normal' | 'limited' | 'severe';
  click_assistance: boolean;
  keyboard_only: boolean;
  target_upscaling: boolean;
}

interface SensoryProfile {
  vision_acuity: 'normal' | 'low' | 'blind';
  color_blindness: string | null;
  audio_sensitivity: boolean;
  high_contrast: boolean;
}

interface ModalityPreferences {
  input_preferred: ('text' | 'speech' | 'vision')[];
  output_preferred: ('visual' | 'auditory' | 'haptic')[];
  auto_tts: boolean;
}

interface UserProfile {
  aura_id: string;
  cognitive: CognitiveProfile;
  motor: MotorProfile;
  sensory: SensoryProfile;
  modalities: ModalityPreferences;
}

const DEFAULT_PROFILE: UserProfile = {
    aura_id: 'guest-' + Math.random().toString(36).substring(7),
    cognitive: { support_level: 'none', simplify_language: true, reduce_distractions: true, memory_aids: false },
    motor: { precision_required: 'normal', click_assistance: false, keyboard_only: false, target_upscaling: false },
    sensory: { vision_acuity: 'normal', color_blindness: null, audio_sensitivity: false, high_contrast: false },
    modalities: { input_preferred: ['text'], output_preferred: ['visual'], auto_tts: false }
};

const API_BASE_URL = (import.meta.env.VITE_AURA_API_URL || 'http://localhost:8000').replace(/\/$/, '');

function App() {
  const [cardData, setCardData] = useState<CardData>({ summary: '', actions: [] });
  const [domData, setDomData] = useState<any>(null);
  const [processTime, setProcessTime] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [proactivePrompt, setProactivePrompt] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // Coordination: Minimize floating UI when side panel opens
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
        const storageKey = 'aura-floating-window-state';
        chrome.storage.local.get(storageKey, (result) => {
            const data = result[storageKey] || {};
            chrome.storage.local.set({ 
                [storageKey]: { ...data, minimized: true } 
            });
        });
    }
  }, []);

  const handleFeedback = async (helpful: boolean) => {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await fetch(`${API_BASE_URL}/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                aura_id: userProfile.aura_id,
                url: tab?.url || 'unknown',
                helpful: helpful
            })
        });
        setShowFeedback(false);
        // Optional: Reset UI adaptations if the user says it wasn't helpful
        if (!helpful && tab?.id) {
            chrome.tabs.sendMessage(tab.id, { action: "RESET_UI" });
        }
    } catch (e) {
        console.error("Failed to send feedback:", e);
    }
  };

  // Load profile on mount
  useEffect(() => {
    const loadProfile = () => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get('auraUserProfile', (result) => {
                if (result.auraUserProfile) {
                    console.log("Aura: Loaded profile from storage:", result.auraUserProfile);
                    setUserProfile(result.auraUserProfile as UserProfile);
                }
            });
        }
    };
    loadProfile();
  }, []);

  // Save profile on change
  const handleProfileChange = async (category: keyof UserProfile, updates: any) => {
      let newProfile: UserProfile;
      if (typeof updates === 'object' && !Array.isArray(updates)) {
          newProfile = { 
              ...userProfile, 
              [category]: { ...(userProfile[category] as any), ...updates } 
          };
      } else {
          newProfile = { ...userProfile, [category]: updates };
      }
      
      setUserProfile(newProfile);
      
      if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.set({ auraUserProfile: newProfile });
      }

      // Sync with backend
      try {
          await fetch(`${API_BASE_URL}/profile/save`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newProfile),
          });
      } catch (e) {
          console.error("Failed to sync profile with backend:", e);
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

      console.log("DOM data received, calling multi-agent runtime...");
      const payload = { 
          dom_data: scrapedData, 
          profile: userProfile,
          logs: ["User initiated proactive help"],
          is_explicit: true
      };
      
      const response = await fetch(`${API_BASE_URL}/process`, {
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

      const result = await response.json();
      console.log("Phased Runtime Result:", result);

      if (result.action === "apply_ui" && result.ui_command) {
          const { ui_command } = result;
          // Apply structural adaptations
          chrome.tabs.sendMessage(tab.id, { 
              action: "ADAPT_UI", 
              adaptations: {
                  hide_elements: ui_command.hide,
                  highlight_elements: ui_command.highlight,
                  layout_mode: ui_command.layout_mode,
                  explanation: ui_command.explanation,
                  risk_level: ui_command.risk_level,
                  complexity: ui_command.complexity,
                  apply_bionic: ui_command.apply_bionic
              }
          });

          // Show the explanation to the user
          setCardData({
              summary: ui_command.explanation,
              actions: [] 
          });
          setShowFeedback(true);

          // Phase 4: Automatic Modal Interactions (e.g., Auto-TTS)
          if (userProfile.modalities.auto_tts) {
              console.log("Aura: Auto-TTS triggered.");
              handleTTS(ui_command.explanation);
          }
      } else if (result.action === "apply_ui" && result.ui_command === undefined && result.mode === "mock_fallback") {
          // Handle mock fallback case specifically if needed, but the above usually covers it
          // Just making sure the logic flow is solid
      } else if (result.action === "suggest_help") {
          setCardData({
              summary: result.message || "Aura detected you might need help. Would you like to simplify the page?",
              actions: ["Yes, please", "No thanks"]
          });
      } else {
          setCardData({
              summary: result.message || "Aura analyzed the page and it looks accessible.",
              actions: []
          });
      }

      setLoading(false);

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
        const response = await fetch(`${API_BASE_URL}/tts`, {
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
        const response = await fetch(`${API_BASE_URL}/action`, {
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
          <section className="settings-panel" aria-labelledby="settings-title" style={{ padding: '1rem', overflowY: 'auto', maxHeight: '70vh' }}>
              <h3 id="settings-title" style={{ color: 'var(--aura-primary)', marginTop: 0 }}>Accessibility Identity</h3>
              <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '1.5rem' }}>ID: {userProfile.aura_id}</p>
              
              <div className="settings-group" style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Cognitive & Language</h4>
                  <div className="setting-item">
                      <label htmlFor="support-level">Support Level:</label>
                      <select 
                        id="support-level"
                        value={userProfile.cognitive.support_level}
                        onChange={(e) => handleProfileChange('cognitive', { support_level: e.target.value })}
                      >
                          <option value="none">None</option>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                      </select>
                  </div>
                  <div className="setting-item">
                    <label>
                        <input 
                            type="checkbox" 
                            checked={userProfile.cognitive.simplify_language}
                            onChange={(e) => handleProfileChange('cognitive', { simplify_language: e.target.checked })}
                        /> Simplify Language
                    </label>
                  </div>
              </div>

              <div className="settings-group" style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Motor & Interaction</h4>
                  <div className="setting-item">
                      <label htmlFor="precision">Precision:</label>
                      <select 
                        id="precision"
                        value={userProfile.motor.precision_required}
                        onChange={(e) => handleProfileChange('motor', { precision_required: e.target.value })}
                      >
                          <option value="normal">Normal</option>
                          <option value="limited">Limited</option>
                          <option value="severe">Severe</option>
                      </select>
                  </div>
                  <div className="setting-item">
                    <label>
                        <input 
                            type="checkbox" 
                            checked={userProfile.motor.target_upscaling}
                            onChange={(e) => handleProfileChange('motor', { target_upscaling: e.target.checked })}
                        /> Upscale Click Targets
                    </label>
                  </div>
              </div>

              <div className="settings-group" style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Sensory & Vision</h4>
                  <div className="setting-item">
                      <label htmlFor="vision">Vision Acuity:</label>
                      <select 
                        id="vision"
                        value={userProfile.sensory.vision_acuity}
                        onChange={(e) => handleProfileChange('sensory', { vision_acuity: e.target.value })}
                      >
                          <option value="normal">Normal</option>
                          <option value="low">Low Acuity</option>
                          <option value="blind">Blind</option>
                      </select>
                  </div>
                  <div className="setting-item">
                    <label>
                        <input 
                            type="checkbox" 
                            checked={userProfile.sensory.high_contrast}
                            onChange={(e) => handleProfileChange('sensory', { high_contrast: e.target.checked })}
                        /> High Contrast
                    </label>
                  </div>
              </div>

              <div className="settings-group" style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Output Preferences</h4>
                  <div className="setting-item">
                    <label>
                        <input 
                            type="checkbox" 
                            checked={userProfile.modalities.auto_tts}
                            onChange={(e) => handleProfileChange('modalities', { auto_tts: e.target.checked })}
                        /> Automatic Speech (TTS)
                    </label>
                  </div>
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
                style={loading ? { animation: 'auraPulse 2s infinite' } : {}}
            >
                {loading ? 'Analyzing Interface...' : 'Explain this Page'}
            </button>

            {loading && (
                <div className="loading-indicator">
                    <div className="aura-spinner"></div>
                    <p style={{ fontWeight: 600 }}>Aura Brain is reasoning...</p>
                </div>
            )}

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

                    {showFeedback && (
                        <div className="feedback-section" style={{ 
                            marginTop: '1rem', 
                            padding: '1rem', 
                            background: '#f8f9fa', 
                            borderRadius: '8px',
                            border: '1px solid #eee',
                            textAlign: 'center'
                        }}>
                            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: '600' }}>Was this adaptation helpful?</p>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                <button className="btn-secondary" onClick={() => handleFeedback(true)} style={{ padding: '0.4rem 1rem' }}>Yes</button>
                                <button className="btn-secondary" onClick={() => handleFeedback(false)} style={{ padding: '0.4rem 1rem' }}>No</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
      )}
    </main>
  );
}

export default App;