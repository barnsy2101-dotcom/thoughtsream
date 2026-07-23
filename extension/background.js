// background.js - ThoughtStream Capture Extension Service Worker

// 1. Explicitly open the side panel when the extension icon in the toolbar is clicked.
// This works reliably in Chrome/Brave/Edge. We guard it with a check because Opera GX
// does not support chrome.sidePanel and uses the native sidebar_action key instead.
if (typeof chrome !== 'undefined' && chrome.sidePanel) {
  chrome.action.onClicked.addListener(async (tab) => {
    try {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    } catch (err) {
      console.error('Failed to open side panel:', err);
    }
  });
} else {
  console.log('chrome.sidePanel is not supported in this browser. Falling back to native sidebar_action.');
}

// 2. Handle storage buffer syncing when the ThoughtStream tab loads
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_BUFFER') {
    (async () => {
      try {
        const result = await chrome.storage.local.get({ thoughtBuffer: [] });
        sendResponse({ thoughts: result.thoughtBuffer });
        // Clear the buffer since it's now synced to the main app page
        await chrome.storage.local.set({ thoughtBuffer: [] });
      } catch (err) {
        console.error('Failed to get/clear thought buffer:', err);
        sendResponse({ thoughts: [] });
      }
    })();
    return true; // Keep message channel open for async response
  }
});
