// src/background.ts

console.log("Aura background service worker loaded.");

const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html'; // Relative path to your offscreen HTML

// Configure the side panel to open when the action icon is clicked
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("Failed to set panel behavior:", error));

async function setupOffscreenDocument(reason: chrome.offscreen.Reason) {
  // Check all active contexts and if an offscreen document is already open, don't create a new one.
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)],
  });

  if (contexts.length > 0) {
    console.log("Offscreen document already exists.");
    return;
  }

  // Create the offscreen document if it doesn't already exist
  console.log("Creating offscreen document...");
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: [reason],
    justification: 'Enables audio and video capture for accessibility features.',
  });
  console.log("Offscreen document created.");
}

// Ask for microphone and camera permission on install by opening a setup page
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: 'setup.html' });
    console.log("Installation detected. Opening setup page for permissions.");
  }
});

// Listen for messages from content scripts, popup, and offscreen document
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log("Background received message:", message.type);

  if (message.type === 'PREFETCH_URL' && message.url) {
    fetch('http://127.0.0.1:8000/prefetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: message.url }),
    })
      .then(response => response.json())
      .then(data => console.log('Prefetch accepted:', data))
      .catch(error => console.error('Prefetch failed:', error));
    return true; // Keep the message channel open for asynchronous response
  } 
  
  if (message.type === 'start_av_capture') {
    (async () => {
      try {
        await setupOffscreenDocument(chrome.offscreen.Reason.USER_MEDIA);
        // Send message to offscreen document to start capture
        chrome.runtime.sendMessage({ type: "start_capture", target: "offscreen" });
        sendResponse({ status: "capture_initiation_sent" });
      } catch (err) {
        console.error("Failed to start AV capture:", err);
        sendResponse({ status: "error", message: String(err) });
      }
    })();
    return true;
  } 
  
  if (message.type === 'stop_av_capture') {
    (async () => {
      try {
        await setupOffscreenDocument(chrome.offscreen.Reason.USER_MEDIA);
        chrome.runtime.sendMessage({ type: "stop_capture", target: "offscreen" });
        sendResponse({ status: "capture_stop_sent" });
      } catch (err) {
        console.error("Failed to stop AV capture:", err);
        sendResponse({ status: "error", message: String(err) });
      }
    })();
    return true;
  } 
  
  if (message.type === 'capture_status') {
    // Handle status updates from the offscreen document
    console.log("Capture status from offscreen:", message.status, message.message);
    sendResponse({ status: "status_received" });
    return false;
  }

  if (message.type === 'WAKE_WORD_DETECTED') {
    console.log("Wake word detected! Attempting to open side panel...");
    
    // Store trigger state so App.tsx can react if it's already open or opens later
    chrome.storage.local.set({ auraWakeWordTriggered: true });

    // Try to open the side panel. This might fail if not triggered by a user gesture.
    // We'll query the active tab to get the windowId.
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      if (tabs.length > 0 && tabs[0].windowId) {
        // @ts-ignore - open might not be in the definition yet depending on version
        if (chrome.sidePanel && chrome.sidePanel.open) {
             chrome.sidePanel.open({ windowId: tabs[0].windowId })
                .catch((err) => console.error("Could not open side panel (likely needs user gesture):", err));
        }
      }
    });
  }

  if (message.type === 'STRUGGLE_DETECTED') {
    console.log("User struggle detected. Flagging for proactive help.");
    chrome.storage.local.set({ auraProactiveHelpTriggered: true });
  }

  return false;
});

// TODO: Implement a function to close the offscreen document when it's no longer needed.
// This management needs to be tailored to your application's lifecycle.
// async function closeOffscreenDocument() {
//   if (await chrome.offscreen.hasDocument()) {
//     await chrome.offscreen.closeDocument();
//     console.log("Offscreen document closed.");
//   }
// }
// Example: Call closeOffscreenDocument based on user action or inactivity.
// setTimeout(closeOffscreenDocument, 5 * 60 * 1000);