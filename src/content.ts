import { checkAndSetup, cleanupObserver } from "./content-logic";

const init = () => {
  // Setup on initial load
  checkAndSetup();

  // Listen for GitHub's pjax events (SPA navigation)
  document.addEventListener("pjax:end", () => {
    checkAndSetup();
  });

  // Clean up observer when page unloads
  window.addEventListener("beforeunload", () => {
    cleanupObserver();
  });
};

// Only run init if not in test environment
if (typeof chrome !== "undefined" && chrome?.runtime) {
  init();
}
