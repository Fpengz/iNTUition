// src/services/speechRecognition.ts

// Declare global SpeechRecognition types with 'any' to bypass strict type checking,
// as the standard 'dom' lib might not fully cover webkitSpeechRecognition or might be conflicting.
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }
  interface SpeechRecognitionResultList {
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
    readonly length: number;
  }
  interface SpeechRecognitionResult {
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
    readonly isFinal: boolean;
    readonly length: number;
  }
  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }
  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: SpeechRecognitionErrorCode;
    readonly message: string;
  }
  type SpeechRecognitionErrorCode = "no-speech" | "aborted" | "audio-capture" | "network" | "not-allowed" | "service-not-allowed" | "bad-grammar" | "language-not-supported";
}


// Check for browser compatibility
const getSpeechRecognition = () => window.SpeechRecognition || window.webkitSpeechRecognition;

interface SpeechRecognitionServiceOptions {
  onResult: (transcript: string) => void;
  onEnd?: () => void;
  onError?: (event: any) => void;
}

export class SpeechRecognitionService {
  private recognition: any; // Type as 'any' to avoid strict type issues with SpeechRecognition constructor
  private isListening = false;
  private options: SpeechRecognitionServiceOptions;

  constructor(options: SpeechRecognitionServiceOptions) {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      throw new Error("Speech Recognition API is not supported in this browser.");
    }
    this.options = options;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      this.options.onResult(finalTranscript.toLowerCase().trim());
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        // If it stops listening but is supposed to be, restart it.
        // This is crucial for continuous listening.
        this.recognition.start();
      }
      if (this.options.onEnd) {
        this.options.onEnd();
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error', event.error);
      if (this.options.onError) {
        this.options.onError(event);
      }
    };
  }

  start() {
    if (!this.isListening) {
      try {
        this.isListening = true;
        this.recognition.start();
        console.log("Speech recognition started.");
      } catch(e) {
        console.error("Could not start speech recognition", e);
      }
    }
  }

  stop() {
    if (this.isListening) {
      this.isListening = false;
      this.recognition.stop();
      console.log("Speech recognition stopped.");
    }
  }
}
