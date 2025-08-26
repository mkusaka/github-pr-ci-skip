import { checkAndSetup, cleanupObserver } from './content-logic';

const init = () => {
  console.log('[CI SKIP] Extension initialized, current URL:', window.location.href);
  // Setup on initial load
  checkAndSetup();

  // Listen for GitHub's pjax events (SPA navigation)
  document.addEventListener('pjax:end', () => {
    console.log('[CI SKIP] pjax:end event fired, current URL:', window.location.href);
    checkAndSetup();
  });

  // Clean up observer when page unloads
  window.addEventListener('beforeunload', () => {
    cleanupObserver();
  });
}

// Only run init if not in test environment
if (typeof chrome !== 'undefined' && chrome?.runtime) {
  console.log('[CI SKIP] Chrome runtime detected, initializing extension');
  init();
} else {
  console.log('[CI SKIP] Chrome runtime not available, extension not initialized');
}
