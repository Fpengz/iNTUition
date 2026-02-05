// src/background.ts

// This background script will now primarily handle messages from content scripts

// and manage storage, but NOT directly run SpeechRecognitionService.

// SpeechRecognitionService runs in a window context (e.g., the popup).



console.log("Aura background service worker loaded.");



// Ask for microphone permission on install (will be used by popup)

chrome.runtime.onInstalled.addListener(() => {

  chrome.permissions.request({ permissions: ['microphone'] as any }, (granted) => {

    if (granted) {

      console.log("Microphone permission requested and granted.");

    } else {

      console.error("Microphone permission denied. Voice features will be unavailable.");

    }

  });

});



// Listen for messages from content scripts (e.g., prefetch)

chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {

    if (message.type === 'PREFETCH_URL' && message.url) {

        fetch('http://127.0.0.1:8000/prefetch', {

            method: 'POST',

            headers: { 'Content-Type': 'application/json' },

            body: JSON.stringify({ url: message.url }),

        })

        .then(response => response.json())

        .then(data => console.log('Prefetch accepted:', data))

        .catch(error => console.error('Prefetch failed:', error));

    }

    return true; // Keep the message channel open for asynchronous response

});