export const appender = () => {
  const prTitleField = document.getElementById("merge_title_field") as HTMLInputElement | null;
  console.log(prTitleField)

  if (prTitleField) {
    // Check if checkbox already exists
    const maybeCheckboxDom = document.getElementById("skip_ci_checkbox") as HTMLInputElement | null
    if (maybeCheckboxDom) {
      maybeCheckboxDom.checked = true
      return
    }

    // Create checkbox
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = "skip_ci_checkbox"
    checkbox.checked = true;
    checkbox.onchange = (checked) => {
      if ((checked.currentTarget as HTMLInputElement).checked) {
        prTitleField.value = `${prTitleField.value} [ci skip]`
      } else {
        prTitleField.value = prTitleField.value.replace(/(\s*)\[(ci skip|skip ci)+\](\s*)/, "")
      }
    }

    const label = document.createElement("label");
    label.innerText = " ci skip toggle "
    label.appendChild(checkbox)

    prTitleField.parentElement?.appendChild(label)

    // Add [ci skip] if not already present
    const alreadyCiSkip = !!(prTitleField.value.match(/ci/) && prTitleField.value.match(/skip/))
    if (!alreadyCiSkip) {
      prTitleField.value = `${prTitleField.value} [ci skip]`
    }
  }
}

// MutationObserver to watch for the PR title field
let observer: MutationObserver | null = null;

export const setupObserver = () => {
  // Disconnect existing observer if any
  if (observer) {
    observer.disconnect();
  }

  observer = new MutationObserver((_mutations) => {
    // Check if the merge_title_field is added to the DOM
    const prTitleField = document.getElementById("merge_title_field");
    if (prTitleField) {
      appender();
      // Optionally disconnect observer after finding the element
      // observer.disconnect();
    }
  });

  // Start observing the document body for added nodes
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Initial check for the element
export const checkAndSetup = () => {
  const prTitleField = document.getElementById("merge_title_field");
  if (prTitleField) {
    appender();
  } else {
    setupObserver();
  }
}

export const cleanupObserver = () => {
  if (observer) {
    observer.disconnect();
  }
}

export const init = () => {
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
