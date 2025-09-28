// Background script for SignSmarter extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('SignSmarter extension installed');
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // This will open the popup automatically due to the manifest configuration
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeDocument') {
    // Handle document analysis requests if needed
    sendResponse({ success: true });
  }
});
