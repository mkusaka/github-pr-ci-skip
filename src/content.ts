import { checkAndSetup, cleanupObserver } from "./content-logic";

const init = () => {
  let lastPath = window.location.pathname;

  // Setup on initial load
  checkAndSetup();

  // Function to handle navigation changes
  const handleNavigation = () => {
    const currentPath = window.location.pathname;
    if (currentPath !== lastPath) {
      lastPath = currentPath;
      checkAndSetup();
    }
  };

  // Listen for GitHub's navigation events (both pjax and Turbo)
  document.addEventListener("pjax:end", handleNavigation);
  document.addEventListener("turbo:load", handleNavigation);
  document.addEventListener("turbo:render", handleNavigation);

  // Also listen for popstate for browser back/forward
  window.addEventListener("popstate", handleNavigation);

  // Clean up observer when page unloads
  window.addEventListener("beforeunload", () => {
    cleanupObserver();
  });
};

// Only run init if not in test environment
if (typeof chrome !== "undefined" && chrome?.runtime) {
  init();
}
