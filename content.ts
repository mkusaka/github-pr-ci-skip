import { checkAndSetup, cleanupObserver } from './content-logic';

const init = () => {
  // Setup on initial load
  checkAndSetup();

  // Handle navigation events
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log(request.url);
    sendResponse(); // Fix for "The message port closed before a response was received"
    
    if (request.url && request.url.match(/pull\//)) {
      // Re-check when navigating to a PR page
      checkAndSetup();
    }
    return true;
  });

  // Also listen for GitHub's pjax events for better compatibility
  document.addEventListener('pjax:end', () => {
    checkAndSetup();
  });

  // Clean up observer when page unloads
  window.addEventListener('beforeunload', () => {
    cleanupObserver();
  });
}

// Only run init if not in test environment
if (typeof chrome !== 'undefined' && chrome?.runtime) {
  init();
}
