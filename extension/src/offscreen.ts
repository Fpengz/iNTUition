/// <reference lib="dom" />

// Define types for Web Speech API
interface Window {
  SpeechRecognition: any;
  webkitSpeechRecognition: any;
}

// Check for browser compatibility
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition: any = null;
let isListening = false;
const WAKE_WORD = "hey aura";

function startWakeWordListener() {
  if (!SpeechRecognition) {
    console.error("Speech Recognition API not supported.");
    return;
  }

  if (isListening) return;

  try {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript.toLowerCase().trim();
          console.log("Offscreen heard:", transcript);
          if (transcript.includes(WAKE_WORD)) {
            console.log("Wake word detected in offscreen!");
            chrome.runtime.sendMessage({ type: "WAKE_WORD_DETECTED" });
          }
        }
      }
    };

    recognition.onend = () => {
      console.log("Speech recognition ended in offscreen.");
      isListening = false;
      // Restart if it stopped unexpectedly
      startWakeWordListener(); 
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error in offscreen:", event.error);
      isListening = false;
    };

    recognition.start();
    isListening = true;
    console.log("Wake word listener started in offscreen.");
    chrome.runtime.sendMessage({ type: "capture_status", status: "started" });

  } catch (error) {
    console.error("Failed to start speech recognition:", error);
    chrome.runtime.sendMessage({ type: "capture_status", status: "error", message: String(error) });
  }
}

function stopWakeWordListener() {
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
  isListening = false;
  console.log("Wake word listener stopped.");
  chrome.runtime.sendMessage({ type: "capture_status", status: "stopped" });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.target === "offscreen") {
    if (message.type === "start_capture") {
      startWakeWordListener();
      sendResponse({ status: "attempted_start" });
    } else if (message.type === "stop_capture") {
      stopWakeWordListener();
      sendResponse({ status: "attempted_stop" });
    }
  }
});

