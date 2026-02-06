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
  theme: 'none' | 'dark' | 'contrast';
  cognitive: CognitiveProfile;
  motor: MotorProfile;
  sensory: SensoryProfile;
  modalities: ModalityPreferences;
}

const DEFAULT_PROFILE: UserProfile = {
    aura_id: 'guest-' + Math.random().toString(36).substring(7),
    theme: 'none',
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
  const [isStreaming, setIsStreaming] = useState(false);
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

      // Apply theme change immediately
      if (category === 'theme') {
          window.postMessage({ type: 'AURA_SET_THEME', theme: updates }, '*');
      }
      
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

  const handleStreamExplain = useCallback(async (scrapedData: any) => {
    setCardData({ summary: '', actions: [] });
    
    try {
      const response = await fetch(`${API_BASE_URL}/explain/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dom_data: scrapedData, profile: userProfile }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Parse SSE format: "data: {...}\n\n"
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.replace('data: ', '');
              const chunk = JSON.parse(jsonStr);
              
              if (chunk.type === 'summary') {
                setCardData(prev => ({
                  ...prev,
                  summary: prev.summary + chunk.content
                }));
              } else if (chunk.type === 'action') {
                setCardData(prev => {
                    // Actions usually come as full sentences in chunks or tokens
                    // For a cleaner UI, we handle action list accumulation
                    if (prev.actions.length === 0) return { ...prev, actions: [chunk.content] };
                    
                    const newActions = [...prev.actions];
                    // If the chunk is a fragment of the last action, append it
                    // In our current delimiter logic, headers handle this, but let's be robust
                    if (chunk.content.startsWith(', ') || chunk.content.startsWith(' ')) {
                        newActions[newActions.length - 1] += chunk.content;
                    } else {
                        newActions.push(chunk.content);
                    }
                    return { ...prev, actions: newActions };
                });
              } else if (chunk.type === 'error') {
                setError(chunk.content);
              }
            } catch (e) {
              console.error("Error parsing stream chunk:", e);
            }
          }
        }
      }
    } catch (err: any) {
      setError(`Streaming failed: ${err.message}`);
    } finally {
      setIsStreaming(false);
    }
  }, [userProfile]);

  const handleExplain = useCallback(async () => {
    setLoading(true);
    setError('');
    setCardData({ summary: '', actions: [] });
    setProcessTime('');
    setShowSettings(false);

    try {
      const getDomPromise = new Promise((resolve, reject) => {
          const handler = (event: any) => {
              if (event.data && event.data.type === 'AURA_DOM_RESPONSE') {
                  window.removeEventListener('message', handler);
                  resolve(event.data.data);
              }
          };
          window.addEventListener('message', handler);
          window.postMessage({ type: 'AURA_GET_DOM' }, '*');
          setTimeout(() => {
              window.removeEventListener('message', handler);
              reject(new Error("DOM scraping timed out"));
          }, 5000);
      });

      const scrapedData: any = await getDomPromise;

      // Start streaming explanation immediately for progressive UX
      handleStreamExplain(scrapedData);

      // Meanwhile, trigger the full agentic process for structural adaptations
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
          
          window.postMessage({ 
              type: 'AURA_ADAPT_UI', 
              adaptations: {
                  hide_elements: ui_command.hide,
                  highlight_elements: ui_command.highlight,
                  layout_mode: ui_command.layout_mode,
                  explanation: ui_command.explanation,
                  apply_bionic: ui_command.apply_bionic,
                  theme: ui_command.theme
              }
          }, '*');

          if (ui_command.visual_validation_required) {
              setTimeout(async () => {
                  try {
                      const response = await chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' });
                      if (response?.dataUrl) {
                          const verifyRes = await fetch(`${API_BASE_URL}/verify`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                  screenshot: response.dataUrl,
                                  goal: ui_command.explanation,
                                  actions_applied: ui_command.highlight,
                                  url: window.location.href
                              })
                          });
                          const verdict = await verifyRes.json();
                          if (verdict.recommendation === 'rollback') {
                              window.postMessage({ type: 'AURA_ADAPT_UI', adaptations: { reset: true } }, '*');
                              setError("Aura detected a layout issue and reverted for safety.");
                          }
                      }
                  } catch (vErr) {
                      console.error("Vision Loop Error:", vErr);
                  }
              }, 1000);
          }
      }

      setLoading(false);
    } catch (err: any) {
      setError(err.message || "An error occurred.");
      setLoading(false);
    }
  }, [userProfile, handleStreamExplain]);

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
                  <label>Appearance:</label>
                  <select 
                    value={userProfile.theme}
                    onChange={(e) => handleProfileChange('theme', e.target.value)}
                    style={{ fontSize: '0.75rem', padding: '2px' }}
                  >
                      <option value="none">Default</option>
                      <option value="dark">Dark Mode</option>
                      <option value="contrast">High Contrast</option>
                  </select>
              </div>
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
            
            {(cardData.summary || isStreaming) && (
                <div style={{ marginTop: '0.75rem' }}>
                    <AuraCardDisplay 
                        summary={cardData.summary}
                        actions={cardData.actions}
                        processTime={processTime}
                        isStreaming={isStreaming}
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
