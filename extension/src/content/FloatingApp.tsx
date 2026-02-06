import React, { useState, useEffect, useCallback } from 'react';
import AuraCardDisplay from '../components/AuraCardDisplay';

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

const FloatingApp: React.FC = () => {
  const [cardData, setCardData] = useState<CardData>({ summary: '', actions: [] });
  const [processTime, setProcessTime] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [showFeedback, setShowFeedback] = useState(false);

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

      try {
          await fetch(`${API_BASE_URL}/profile/save`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newProfile),
          });
      } catch (e) {
          console.error("Failed to sync profile:", e);
      }
  };

  const handleExplain = useCallback(async () => {
    setLoading(true);
    setError('');
    setCardData({ summary: '', actions: [] });
    setProcessTime('');
    setShowSettings(false);

    try {
      // In content script, we can't use chrome.tabs.sendMessage to ourselves easily,
      // but we can trigger a custom event or just use a window message.
      // For now, let's trigger it via chrome.runtime.sendMessage to background, which then sends it back to us,
      // OR just call the function if we expose it on window.
      
      // Let's try to get DOM data by sending a message that OUR OWN content script will catch.
      // Wait, content scripts can't catch messages from themselves via chrome.runtime.onMessage.
      // But we can use window.postMessage.
      
      // Simpler: let's use chrome.runtime.sendMessage to background and let background handle the coordination if needed,
      // but actually we just need the DOM data.
      
      // I'll assume for now that FloatingApp is injected in a way that it can access the DOM.
      // We'll dispatch a custom event that the content script index.ts is listening for.
      
      const getDomPromise = new Promise((resolve, reject) => {
          const handler = (event: any) => {
              if (event.data && event.data.type === 'AURA_DOM_RESPONSE') {
                  window.removeEventListener('message', handler);
                  resolve(event.data.data);
              }
          };
          window.addEventListener('message', handler);
          window.postMessage({ type: 'AURA_GET_DOM' }, '*');
          
          // Timeout
          setTimeout(() => {
              window.removeEventListener('message', handler);
              reject(new Error("DOM scraping timed out"));
          }, 5000);
      });

      const scrapedData: any = await getDomPromise;

      const payload = { 
          dom_data: scrapedData, 
          profile: userProfile,
          logs: ["User initiated proactive help from floating UI"],
          is_explicit: true
      };
      
      const response = await fetch(`${API_BASE_URL}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const timeHeader = response.headers.get('X-Process-Time');
      if (timeHeader) setProcessTime(timeHeader);

      if (!response.ok) throw new Error(`Backend error (${response.status})`);

      const result = await response.json();

      if (result.action === "apply_ui" && result.ui_command) {
          const { ui_command } = result;
          
          // Trigger adaptation in content script
          window.postMessage({ 
              type: 'AURA_ADAPT_UI', 
              adaptations: {
                  hide_elements: ui_command.hide,
                  highlight_elements: ui_command.highlight,
                  layout_mode: ui_command.layout_mode,
                  explanation: ui_command.explanation,
                  apply_bionic: ui_command.apply_bionic
              }
          }, '*');

          setCardData({ summary: ui_command.explanation, actions: [] });
          setShowFeedback(true);

          if (userProfile.modalities.auto_tts) {
              handleTTS(ui_command.explanation);
          }
      } else {
          setCardData({
              summary: result.message || "Aura analyzed the page and it looks accessible.",
              actions: []
          });
      }

      setLoading(false);
    } catch (err: any) {
      setError(err.message || "An error occurred.");
      setLoading(false);
    }
  }, [userProfile]);

  const handleTTS = async (text: string) => {
    try {
        const response = await fetch(`${API_BASE_URL}/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
    } catch (err: any) {
        console.error("TTS Error:", err);
    }
  };

  const handleActionClick = async (action: string) => {
    // Similar to handleExplain, get DOM first then call action endpoint
    // Implementation omitted for brevity but follows same pattern
    console.log("Action clicked:", action);
  };

  const handleFeedback = (helpful: boolean) => {
      // Implementation similar to App.tsx
      console.log("Feedback:", helpful);
      setShowFeedback(false);
  };

  return (
    <div className="aura-container" style={{ height: 'auto', padding: '0.75rem', background: 'transparent' }}>
      <header className="aura-header" style={{ marginBottom: '0.75rem' }}>
        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#6366f1' }}>Aura Assistant</h2>
        <button 
            className="btn-secondary"
            onClick={() => setShowSettings(!showSettings)}
            style={{ padding: '3px 6px', fontSize: '0.7rem' }}
        >
            {showSettings ? 'Back' : 'Settings'}
        </button>
      </header>

      {showSettings ? (
          <div className="settings-panel" style={{ padding: '0.4rem', fontSize: '0.8rem' }}>
              <div className="setting-item" style={{ marginBottom: '0.5rem' }}>
                  <label>Support Level:</label>
                  <select 
                    value={userProfile.cognitive.support_level}
                    onChange={(e) => handleProfileChange('cognitive', { support_level: e.target.value })}
                    style={{ fontSize: '0.75rem', padding: '2px' }}
                  >
                      <option value="none">None</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                  </select>
              </div>
              <div className="setting-item" style={{ marginBottom: '0.5rem' }}>
                <label>
                    <input 
                        type="checkbox" 
                        checked={userProfile.cognitive.simplify_language}
                        onChange={(e) => handleProfileChange('cognitive', { simplify_language: e.target.checked })}
                    /> Simplify Language
                </label>
              </div>
              <div className="setting-item" style={{ marginBottom: '0.5rem' }}>
                <label>
                    <input 
                        type="checkbox" 
                        checked={userProfile.modalities.auto_tts}
                        onChange={(e) => handleProfileChange('modalities', { auto_tts: e.target.checked })}
                    /> Auto-TTS
                </label>
              </div>
          </div>
      ) : (
        <>
            <button 
                className="btn-primary"
                onClick={() => handleExplain()} 
                disabled={loading}
                style={{ 
                    padding: '8px', 
                    fontSize: '0.9rem',
                    borderRadius: '8px',
                    animation: loading ? 'auraPulse 2s infinite' : 'none'
                }}
            >
                {loading ? 'Analyzing...' : 'Explain Page'}
            </button>

            {error && <div className="error-message" style={{ fontSize: '0.7rem', padding: '6px', marginTop: '0.5rem' }}>{error}</div>}
            
            {cardData.summary && (
                <div style={{ marginTop: '0.75rem' }}>
                    <AuraCardDisplay 
                        summary={cardData.summary}
                        actions={cardData.actions}
                        processTime={processTime}
                        onTTSClick={handleTTS}
                        onActionClick={handleActionClick}
                    />

                    {showFeedback && (
                        <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.8rem' }}>
                            <p>Helpful?</p>
                            <button className="btn-secondary" onClick={() => handleFeedback(true)}>Yes</button>
                            <button className="btn-secondary" onClick={() => handleFeedback(false)} style={{ marginLeft: '4px' }}>No</button>
                        </div>
                    )}
                </div>
            )}
        </>
      )}
    </div>
  );
};

export default FloatingApp;
