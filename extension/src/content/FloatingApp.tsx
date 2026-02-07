import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, ArrowLeft, Sparkles, Brain, MousePointer2, Eye, User, Info } from 'lucide-react';
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

const formatErrorMessage = (err: any) => {
    const message = err.message || String(err);
    if (message.includes('Failed to fetch') || message.includes('Connection refused') || message.includes('Errno 61')) {
        return "Aura Brain is offline. Please ensure the backend server is running.";
    }
    return message;
};

interface FloatingAppProps {
  externalShowSettings?: boolean;
  onSettingsOpen?: () => void;
}

const FloatingApp: React.FC<FloatingAppProps> = ({ externalShowSettings, onSettingsOpen }) => {
  const [cardData, setCardData] = useState<CardData>({ summary: '', actions: [] });
  const [processTime, setProcessTime] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);

  // Sync external showSettings
  useEffect(() => {
    if (externalShowSettings) {
      setShowSettings(true);
      if (onSettingsOpen) onSettingsOpen();
    }
  }, [externalShowSettings, onSettingsOpen]);

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
    setIsStreaming(true);
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
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

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
                    if (prev.actions.length === 0) return { ...prev, actions: [chunk.content] };
                    const newActions = [...prev.actions];
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
      setError(`Streaming failed: ${formatErrorMessage(err)}`);
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

      handleStreamExplain(scrapedData);

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
      }

      setLoading(false);
    } catch (err: any) {
      setError(formatErrorMessage(err));
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
    console.log("Action clicked:", action);
  };

  const SectionHeader = ({ icon: Icon, title, color }: any) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', marginTop: '12px' }}>
        <div style={{ padding: '8px', background: `${color}15`, borderRadius: '10px', color }}>
            <Icon size={18} />
        </div>
        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#334155' }}>{title}</h4>
    </div>
  );

  const SettingToggle = ({ label, checked, onChange }: any) => (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>{label}</span>
          <button 
            onClick={() => onChange(!checked)}
            style={{ 
                width: '42px', 
                height: '24px', 
                background: checked ? '#6366f1' : '#e2e8f0',
                borderRadius: '12px',
                position: 'relative',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
            }}
          >
              <motion.div 
                animate={{ x: checked ? 20 : 2 }}
                style={{ width: '20px', height: '20px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px' }}
              />
          </button>
      </div>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <AnimatePresence mode="wait">
        {!showSettings ? (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>Hello!</h2>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Aura is ready to assist.</p>
                </div>
                <button 
                    onClick={() => setShowSettings(true)}
                    style={{ background: '#f1f5f9', border: 'none', borderRadius: '12px', padding: '10px', cursor: 'pointer', color: '#64748b' }}
                >
                    <Settings size={20} />
                </button>
            </div>

            <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleExplain()} 
                disabled={loading}
                style={{ 
                    padding: '16px', 
                    fontSize: '16px',
                    fontWeight: 800,
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 10px 20px -5px rgba(99, 102, 241, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px'
                }}
            >
                {loading ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                        <Sparkles size={20} />
                    </motion.div>
                ) : <Sparkles size={20} />}
                {loading ? 'Thinking...' : 'Analyze Page'}
            </motion.button>

            {error && (
                <div style={{ marginTop: '16px', padding: '12px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', color: '#b91c1c', fontSize: '13px', display: 'flex', gap: '8px' }}>
                    <Info size={16} />
                    {error}
                </div>
            )}
            
            <div style={{ flex: 1, overflowY: 'auto', marginTop: '20px', marginLeft: '-20px', marginRight: '-20px' }}>
                {(cardData.summary || isStreaming) && (
                    <AuraCardDisplay 
                        summary={cardData.summary}
                        actions={cardData.actions}
                        processTime={processTime}
                        isStreaming={isStreaming}
                        onTTSClick={handleTTS}
                        onActionClick={handleActionClick}
                    />
                )}
                
                {!cardData.summary && !loading && !error && (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                        <Brain size={40} style={{ marginBottom: '12px', opacity: 0.2 }} />
                        <p style={{ fontSize: '14px', fontWeight: 500 }}>Click above to simplify this interface or get an overview.</p>
                    </div>
                )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="settings"
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            style={{ padding: '20px', flex: 1, overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <button 
                    onClick={() => setShowSettings(false)}
                    style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#64748b' }}
                >
                    <ArrowLeft size={20} />
                </button>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>Preferences</h2>
            </div>

            <SectionHeader icon={Brain} title="Cognitive Support" color="#6366f1" />
            <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '4px 16px', marginBottom: '24px' }}>
                <SettingToggle 
                    label="Simplify Language" 
                    checked={userProfile.cognitive.simplify_language}
                    onChange={(val: boolean) => handleProfileChange('cognitive', { simplify_language: val })}
                />
                <SettingToggle 
                    label="Reduce Distractions" 
                    checked={userProfile.cognitive.reduce_distractions}
                    onChange={(val: boolean) => handleProfileChange('cognitive', { reduce_distractions: val })}
                />
            </div>

            <SectionHeader icon={MousePointer2} title="Motor & Interaction" color="#a855f7" />
            <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '4px 16px', marginBottom: '24px' }}>
                <SettingToggle 
                    label="Upscale Targets" 
                    checked={userProfile.motor.target_upscaling}
                    onChange={(val: boolean) => handleProfileChange('motor', { target_upscaling: val })}
                />
                <SettingToggle 
                    label="Click Assistance" 
                    checked={userProfile.motor.click_assistance}
                    onChange={(val: boolean) => handleProfileChange('motor', { click_assistance: val })}
                />
            </div>

            <SectionHeader icon={Eye} title="Vision & Sensory" color="#f59e0b" />
            <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '4px 16px', marginBottom: '24px' }}>
                <SettingToggle 
                    label="High Contrast" 
                    checked={userProfile.sensory.high_contrast}
                    onChange={(val: boolean) => handleProfileChange('sensory', { high_contrast: val })}
                />
            </div>

            <SectionHeader icon={User} title="Identity" color="#64748b" />
            <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '16px', marginBottom: '24px' }}>
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Aura ID</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', fontWeight: 700, color: '#475569' }}>{userProfile.aura_id}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FloatingApp;