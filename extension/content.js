// content.js - ThoughtStream Capture Extension Content Script Bridge

// 1. On page load, fetch any buffered thoughts from background.js and sync them to the page
chrome.runtime.sendMessage({ type: 'GET_BUFFER' }, (response) => {
  if (response && Array.isArray(response.thoughts) && response.thoughts.length > 0) {
    window.postMessage({
      type: 'ADD_THOUGHT_EXTERNAL_BATCH',
      thoughts: response.thoughts
    }, '*');
  }
});

// 2. Listen for messages from the extension sidepanel and forward them to the page in real-time
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ADD_THOUGHT_EXTERNAL') {
    window.postMessage({
      type: 'ADD_THOUGHT_EXTERNAL',
      text: message.text
    }, '*');
    sendResponse({ success: true });
  }
});
