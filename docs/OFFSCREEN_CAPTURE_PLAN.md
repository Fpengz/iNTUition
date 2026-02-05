# Offscreen Document Capture Plan for Voice and Camera

## Objective

Implement a Chrome Extension (Manifest V3) to capture the user's microphone and camera input using an Offscreen Document. The captured data will serve as input for accessibility modules within the backend, enabling features like real-time facial emotion analysis, gesture recognition, and speech-to-text, enhancing multimodal interactions for users.

## Components Involved

1.  **`manifest.json`**: To declare necessary permissions, including the `offscreen` API.
2.  **Background Service Worker (`extension/src/background.ts`)**:
    *   Manages the lifecycle of the Offscreen Document.
    *   Receives messages from the extension's popup/content scripts to initiate/stop capture.
    *   Communicates with the Offscreen Document to start/stop media capture.
    *   Receives processed media data (or raw data) from the Offscreen Document and forwards it to the backend.
3.  **Offscreen Document (`extension/offscreen.html` and `extension/src/offscreen.ts`)**:
    *   A minimalist HTML page (`offscreen.html`) that will be loaded by the background script.
    *   A dedicated JavaScript/TypeScript file (`offscreen.ts`) linked to `offscreen.html`.
    *   Hosts the `navigator.mediaDevices.getUserMedia()` call to access the user's microphone and camera.
    *   Handles the media streams.
    *   Performs any initial local processing (e.g., resizing video frames, converting audio formats, or basic feature extraction) before sending data to the background script.
    *   Communicates with the background script via `chrome.runtime.sendMessage()`.
4.  **Backend (`backend/app/main.py`)**:
    *   Receives processed audio/video data from the extension.
    *   Integrates AI models for facial emotion analysis, gesture recognition, speech-to-text, etc.
    *   Sends back relevant accessibility adaptations or responses to the extension.

## High-Level Flow

1.  **User Action**: The user initiates audio/video capture (e.g., by clicking a button in the extension popup or through a command from a content script).
2.  **Background Script Initiates**: The background service worker receives this request.
    *   It checks if an Offscreen Document already exists.
    *   If not, it creates a new Offscreen Document instance using `chrome.offscreen.createDocument()`, pointing to `extension/offscreen.html`.
    *   It sends a message to the newly created (or existing) Offscreen Document to start capture.
3.  **Offscreen Document Captures Media**:
    *   Upon receiving the "start capture" message, the `offscreen.ts` script calls `navigator.mediaDevices.getUserMedia({ audio: true, video: true })`.
    *   The browser prompts the user for microphone and camera access.
    *   Once granted, media streams are acquired.
    *   The Offscreen Document continuously processes (e.g., samples, chunks) the audio and video data.
    *   It sends these data chunks to the background script via `chrome.runtime.sendMessage()`.
4.  **Background Script Forwards Data**:
    *   The background script receives the media data chunks from the Offscreen Document.
    *   It forwards these data chunks to the `backend` API endpoint for AI processing.
5.  **Backend AI Processing**:
    *   The backend receives the media data.
    *   Utilizes AI models for facial emotion analysis, gesture recognition, speech-to-text, etc.
    *   Generates accessibility insights or commands.
6.  **Backend Response to Extension**:
    *   The backend sends processed information back to the background script.
7.  **Extension Delivers Accessibility**:
    *   The background script can then update the UI, trigger other extension functionalities, or send messages to content scripts to adapt the web page based on the AI insights.
8.  **Stopping Capture**: The user or extension logic triggers a "stop capture" event, which is propagated from the background script to the Offscreen Document, causing `getUserMedia` streams to be stopped and potentially closing the Offscreen Document.

## `manifest.json` Changes

Add the `offscreen` permission and `microphone`/`camera` if not implicitly handled:

```json
{
  "name": "iNTUition Extension",
  "version": "1.0",
  "manifest_version": 3,
  "permissions": [
    "offscreen",
    "activeTab",
    "microphone", // Explicitly request microphone access
    "camera"      // Explicitly request camera access
  ],
  "background": {
    "service_worker": "background.ts" // Assuming this is your background script entry
  },
  // ... other manifest fields
}
```

## Offscreen Document Files

### `extension/offscreen.html` (New File)

A minimal HTML file:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Offscreen Document</title>
    <script src="src/offscreen.ts" type="module"></script>
</head>
<body>
    <!-- This page is not visible to the user -->
</body>
</html>
```

### `extension/src/offscreen.ts` (New File)

This script will contain the logic for `getUserMedia` and messaging.

```typescript
// Initial draft - detailed implementation will follow
let mediaStream: MediaStream | null = null;
let audioProcessor: AudioWorkletNode | null = null;
let videoProcessor: MediaStreamTrackProcessor | null = null; // For future video processing

async function startCapture() {
  if (mediaStream) return; // Already capturing

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    // Process audio
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(mediaStream);
    // You'd typically use an AudioWorklet or AnalyzerNode here for processing
    // For simplicity, we'll just demonstrate sending a "started" message.
    console.log("Audio/Video capture started in offscreen document.");

    // TODO: Implement actual audio/video processing and sending data to background script
    // Example: Periodically send audio chunks or video frames

    // Send a message back to the background script confirming capture started
    chrome.runtime.sendMessage({ type: "capture_status", status: "started" });

  } catch (error) {
    console.error("Error accessing media devices:", error);
    chrome.runtime.sendMessage({ type: "capture_status", status: "error", message: error.message });
  }
}

function stopCapture() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
    console.log("Audio/Video capture stopped in offscreen document.");
    chrome.runtime.sendMessage({ type: "capture_status", status: "stopped" });
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target === "offscreen") {
    if (message.type === "start_capture") {
      startCapture();
      sendResponse({ status: "attempted_start" });
    } else if (message.type === "stop_capture") {
      stopCapture();
      sendResponse({ status: "attempted_stop" });
    }
  }
});

console.log("Offscreen document loaded.");
```

## Background Script Updates (`extension/src/background.ts`)

This script will handle creating and communicating with the offscreen document.

```typescript
// Initial draft - detailed implementation will follow
const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html'; // Relative path to your offscreen HTML

async function setupOffscreenDocument(reason: chrome.offscreen.Reason) {
  // Check all active contexts and if an offscreen document is already open, don't create a new one.
  for (const context of await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)],
  })) {
    if (context.contextType === 'OFFSCREEN_DOCUMENT') {
      return;
    }
  }

  // Create the offscreen document if it doesn't already exist
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: [reason],
    justification: 'Enables audio and video capture for accessibility features.',
  });
}

// Example listener for starting capture (e.g., from a popup or content script)
chrome.runtime.onMessage.addListener(async (message) => {
  if (message.type === 'start_av_capture') {
    await setupOffscreenDocument(chrome.offscreen.Reason.USER_MEDIA);
    // Send message to offscreen document to start capture
    chrome.runtime.sendMessage({ type: "start_capture", target: "offscreen" });
  } else if (message.type === 'stop_av_capture') {
    await setupOffscreenDocument(chrome.offscreen.Reason.USER_MEDIA); // Ensure doc exists to send stop message
    // Send message to offscreen document to stop capture
    chrome.runtime.sendMessage({ type: "stop_capture", target: "offscreen" });
  } else if (message.type === 'capture_status') {
    // Handle status updates from the offscreen document
    console.log("Capture status from offscreen:", message.status, message.message);
    // TODO: Forward status to popup or notify user
  }
  // TODO: Add logic to send captured data to the backend
});

// Remove the offscreen document when the service worker is deactivated or when no longer needed
// This might require more sophisticated management based on your use case.
// For now, it will persist as long as the service worker is active, or until explicitly closed.
```

## Considerations

*   **User Consent**: The browser will show a clear prompt asking the user for microphone and camera access.
*   **Data Transfer**: Determine the most efficient way to transfer audio/video data (raw frames/chunks, or pre-processed features) from the offscreen document to the background script, and then to the backend. WebSockets or `fetch` API calls from the background script are typical.
*   **Performance**: Optimize media processing in the offscreen document to avoid performance bottlenecks. Consider using Web Audio API for audio processing and WebGL/WebCodecs for video processing if complex operations are needed client-side.
*   **Lifecycle Management**: Carefully manage the lifecycle of the Offscreen Document. It should only be active when capture is truly needed to conserve resources.
*   **Privacy**: Clearly inform users about what data is being captured and how it's being used.
