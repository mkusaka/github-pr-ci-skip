let observer: MutationObserver | null = null;

// Helper function to find the merge title field using various selectors
const findMergeTitleField = (): HTMLInputElement | null => {
  // First try to find by label text
  const labelElement = Array.from(document.querySelectorAll("label")).find(
    (label: HTMLLabelElement) => label.textContent?.trim() === "Commit message",
  );

  let prTitleField: HTMLInputElement | null = null;

  if (labelElement) {
    // Try to find the input using the label's 'for' attribute
    const forAttr = labelElement.getAttribute("for");
    if (forAttr) {
      prTitleField = document.getElementById(
        forAttr,
      ) as HTMLInputElement | null;
      if (prTitleField) {
        return prTitleField;
      }
    }
  }

  // If not found, try other selectors
  const selectors = [
    // GitHub UI selectors (using stable attributes)
    'input[data-component="input"]',
    'input[type="text"][value*="Merge pull request"]',

    // Look for text input in a form control container that's likely the merge dialog
    '.bgColor-muted input[type="text"]:first-of-type',
    'div[data-has-label] input[type="text"]:first-of-type',
  ];

  for (const selector of selectors) {
    try {
      prTitleField = document.querySelector(
        selector,
      ) as HTMLInputElement | null;
      if (prTitleField && prTitleField.type === "text") {
        // Validate it's likely the commit message field by checking its value
        if (
          prTitleField.value?.includes("Merge pull request") ||
          prTitleField.value?.includes("Merge branch") ||
          prTitleField.closest(".bgColor-muted") ||
          prTitleField.closest("div[data-has-label]")
        ) {
          return prTitleField;
        }
      }
    } catch {
      // Some selectors might not be valid, ignore errors
    }
  }

  return null;
};

export const appender = () => {
  const prTitleField = findMergeTitleField();

  if (prTitleField) {
    // Check if checkbox already exists
    const maybeCheckboxDom = document.getElementById(
      "skip_ci_checkbox",
    ) as HTMLInputElement | null;
    if (maybeCheckboxDom) {
      maybeCheckboxDom.checked = true;
      return;
    }

    // Create checkbox
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = "skip_ci_checkbox";
    checkbox.checked = true;
    checkbox.onchange = (checked) => {
      if ((checked.currentTarget as HTMLInputElement).checked) {
        // Remove any existing [ci skip] or [skip ci] tags
        const cleanedValue = prTitleField.value
          .replace(/^\[ci skip\]\s*|\[skip ci\]\s*/gi, "")
          .trim();
        // Add [ci skip] at the beginning
        prTitleField.value = `[ci skip] ${cleanedValue}`;
      } else {
        // Remove [ci skip] or [skip ci] from the beginning
        prTitleField.value = prTitleField.value
          .replace(/^\[ci skip\]\s*|\[skip ci\]\s*/gi, "")
          .trim();
      }
    };

    // Create button using GitHub's CSS classes
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-sm ml-1"; // GitHub's button classes
    button.title = "Toggle CI skip for this merge commit";

    // Create container for checkbox and label
    const container = document.createElement("span");
    container.className = "d-flex flex-items-center"; // Use flex-items-center for vertical centering

    // Add "CI Skip" text
    const labelText = document.createElement("span");
    labelText.textContent = "CI Skip";
    labelText.className = "mr-1"; // Just margin, no text-small which might cause alignment issues

    // Use form-checkbox with margin reset
    checkbox.className = "form-checkbox my-0"; // my-0 removes vertical margin

    // Assemble the button structure
    container.appendChild(labelText);
    container.appendChild(checkbox);
    button.appendChild(container);

    // Handle click on the button (but not on checkbox itself)
    button.onclick = (e) => {
      // If clicking on the checkbox itself, let it handle its own change
      if (e.target !== checkbox) {
        e.preventDefault();
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event("change"));
      }
    };

    // First, find the Confirm merge button
    const confirmBtn = Array.from(document.querySelectorAll("button")).find(
      (btn: HTMLButtonElement) => btn.textContent?.trim() === "Confirm merge",
    );

    if (
      confirmBtn &&
      confirmBtn.parentElement &&
      confirmBtn.parentElement.parentElement
    ) {
      // confirmBtn.parentElement is data-loading-wrapper
      // confirmBtn.parentElement.parentElement is the main flex container
      const loadingWrapper = confirmBtn.parentElement;
      const mainContainer = loadingWrapper.parentElement;

      // Find Cancel button in the main container
      if (mainContainer) {
        const cancelButton = Array.from(
          mainContainer.querySelectorAll("button"),
        ).find(
          (btn: HTMLButtonElement) => btn.textContent?.trim() === "Cancel",
        );

        if (cancelButton) {
          // Insert CI Skip button after Cancel button
          cancelButton.parentNode?.insertBefore(
            button,
            cancelButton.nextSibling,
          );
        } else {
          // Insert after the loading wrapper if Cancel button not found
          loadingWrapper.parentNode?.insertBefore(
            button,
            loadingWrapper.nextSibling,
          );
        }
      } else {
        // Insert after the loading wrapper if mainContainer is not found
        loadingWrapper.parentNode?.insertBefore(
          button,
          loadingWrapper.nextSibling,
        );
      }
    } else {
      // Fallback: try to find any flex container with buttons
      const buttonContainer =
        document.querySelector(".d-flex.gap-2.mt-3") ||
        document.querySelector('[class*="flex"][class*="gap-2"]');

      if (buttonContainer) {
        buttonContainer.appendChild(button);
      } else {
        // Final fallback to parent element
        const parentElement = prTitleField.parentElement;
        if (parentElement) {
          parentElement.appendChild(button);
        }
      }
    }

    // Add [ci skip] at the beginning if not already present
    const alreadyCiSkip = /^\[ci skip\]|^\[skip ci\]/i.test(prTitleField.value);
    if (!alreadyCiSkip) {
      prTitleField.value = `[ci skip] ${prTitleField.value}`;
    }
  }
};

export const setupObserver = () => {
  // Check if document.body exists before trying to observe it
  if (!document.body) {
    // If body doesn't exist yet, try again after a short delay
    setTimeout(setupObserver, 100);
    return;
  }

  // Disconnect existing observer if any
  if (observer) {
    observer.disconnect();
  }

  observer = new MutationObserver((_mutations) => {
    // Try to find the merge title field
    const prTitleField = findMergeTitleField();

    if (prTitleField) {
      appender();
      // Optionally disconnect observer after finding the element
      // observer.disconnect();
    }
  });

  // Start observing the document body for added nodes
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
};

export const checkAndSetup = () => {
  // Only run on GitHub PR pages
  const currentPath = window.location.pathname;
  const isPRPage = currentPath.match(/^\/[^\/]+\/[^\/]+\/pull\/\d+/);

  if (!isPRPage) {
    // Clean up any existing observers and elements when not on PR page
    cleanupObserver();
    // Remove any existing CI skip checkbox
    const existingCheckbox = document.getElementById("skip_ci_checkbox");
    if (existingCheckbox) {
      existingCheckbox.closest("button")?.remove();
    }
    return;
  }

  // We're on a PR page, ensure observer is active
  const prTitleField = findMergeTitleField();

  if (prTitleField) {
    appender();
  } else {
    // Always set up observer on PR pages, even if it already exists
    setupObserver();
  }
};

export const cleanupObserver = () => {
  if (observer) {
    observer.disconnect();
  }
};
