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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Define handleExplain using useCallback to stabilize its reference
  const handleExplain = useCallback(async () => {
    setLoading(true);
    setError('');
    setCardData({ summary: '', actions: [] });

    try {
      if (typeof chrome === 'undefined' || !chrome.tabs) {
        throw new Error("Aura must be run as a Chrome Extension.");
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error("Could not find active tab.");

      const domData = await chrome.tabs.sendMessage(tab.id, { action: "GET_DOM" });
      if (!domData) throw new Error("Content script not responding.");

      const payload = { dom_data: domData, profile: null };
      
      const response = await fetch('http://127.0.0.1:8000/explain/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

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
  }, []); // Empty dependency array means this function is created once

  // Use a ref to store handleExplain to allow useEffect to access its latest version
  const handleExplainRef = useRef(handleExplain);
  useEffect(() => {
    handleExplainRef.current = handleExplain;
  }, [handleExplain]); // Update ref whenever handleExplain changes

  // useEffect for Speech Recognition
  useEffect(() => {
    let recognitionService: SpeechRecognitionService | undefined;
    if (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
      try {
        recognitionService = new SpeechRecognitionService({
          onResult: (transcript) => {
            if (transcript.includes(WAKE_WORD) && !loading) {
              console.log("Wake word detected in popup!");
              handleExplainRef.current();
            }
          },
          onError: (event) => {
            console.error("Speech Recognition Error:", event.error);
            setError(`Voice input error: ${event.error}. Ensure microphone access.`);
          }
        });
        recognitionService.start();
        console.log("Speech recognition started in popup.");
      } catch (e: any) {
        console.error("Failed to initialize Speech Recognition:", e);
        setError(`Speech Recognition not available: ${e.message}`);
      }
    } else {
      setError("Speech Recognition API not supported or available.");
    }

    return () => {
      if (recognitionService) {
        recognitionService.stop();
        console.log("Speech recognition stopped in popup.");
      }
    };
  }, [loading]); // Re-run if loading state changes, to potentially enable/disable wake word

  // Existing useEffect for wake word trigger from storage
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get('auraWakeWordTriggered', (result) => {
        if (result.auraWakeWordTriggered) {
          chrome.storage.local.remove('auraWakeWordTriggered');
          handleExplainRef.current();
        }
      });
    }
  }, []); // Run only once on mount

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

  return (
    <div className="aura-container" style={{ width: '350px', padding: '1rem' }}>
      <h1>Aura</h1>
      <button onClick={() => handleExplain()} disabled={loading}>
        {loading ? 'Thinking...' : 'Explain this Page'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      {!loading && cardData.summary && (
        <div className="explanation-box" style={{ marginTop: '1rem' }}>
            <AuraCardDisplay 
                summary={cardData.summary}
                actions={cardData.actions}
                onTTSClick={handleTTS}
            />
        </div>
      )}
    </div>
  );
}

export default App;