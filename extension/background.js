// background.js - ThoughtStream Capture Extension Service Worker

// 1. Handle Keyboard Shortcut (Alt+Shift+T) to toggle Floating In-Page Overlay
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-overlay') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_FLOATING_OVERLAY' });
      }
    });
  }
});

// 2. Handle Storage Buffer & Syncing
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_BUFFER') {
    (async () => {
      try {
        const result = await chrome.storage.local.get({ thoughtBuffer: [] });
        sendResponse({ thoughts: result.thoughtBuffer });
        await chrome.storage.local.set({ thoughtBuffer: [] });
      } catch (err) {
        sendResponse({ thoughts: [] });
      }
    })();
    return true;
  }
  if (message.type === 'BUFFER_THOUGHT') {
    (async () => {
      try {
        const result = await chrome.storage.local.get({ thoughtBuffer: [] });
        result.thoughtBuffer.push(message.text);
        await chrome.storage.local.set({ thoughtBuffer: result.thoughtBuffer });
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false });
      }
    })();
    return true;
  }
});
