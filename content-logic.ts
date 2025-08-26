let observer: MutationObserver | null = null;

// Helper function to find the merge title field using various selectors
const findMergeTitleField = (): HTMLInputElement | null => {
  // First try to find by label text
  const labelElement = Array.from(document.querySelectorAll('label')).find(
    label => label.textContent?.trim() === 'Commit message'
  );
  
  let prTitleField: HTMLInputElement | null = null;
  
  if (labelElement) {
    // Try to find the input using the label's 'for' attribute
    const forAttr = labelElement.getAttribute('for');
    if (forAttr) {
      prTitleField = document.getElementById(forAttr) as HTMLInputElement | null;
      if (prTitleField) {
        console.log(`[CI SKIP] Found field using label's for attribute: "${forAttr}"`);
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
    'div[data-has-label] input[type="text"]:first-of-type'
  ];
  
  for (const selector of selectors) {
    try {
      prTitleField = document.querySelector(selector) as HTMLInputElement | null;
      if (prTitleField && prTitleField.type === 'text') {
        // Validate it's likely the commit message field by checking its value
        if (prTitleField.value?.includes('Merge pull request') || 
            prTitleField.value?.includes('Merge branch') ||
            prTitleField.closest('.bgColor-muted') ||
            prTitleField.closest('div[data-has-label]')) {
          console.log(`[CI SKIP] Found field using selector: "${selector}"`);
          return prTitleField;
        }
      }
    } catch (e) {
      // Some selectors might not be valid, ignore errors
    }
  }
  
  return null;
}

export const appender = () => {
  console.log('[CI SKIP] appender called');
  
  const prTitleField = findMergeTitleField();
  console.log('[CI SKIP] prTitleField found:', prTitleField)

  if (prTitleField) {
    console.log('[CI SKIP] prTitleField exists, checking for existing checkbox');
    // Check if checkbox already exists
    const maybeCheckboxDom = document.getElementById("skip_ci_checkbox") as HTMLInputElement | null
    if (maybeCheckboxDom) {
      console.log('[CI SKIP] Checkbox already exists, setting to checked');
      maybeCheckboxDom.checked = true
      return
    }

    // Create checkbox
    console.log('[CI SKIP] Creating new checkbox');
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = "skip_ci_checkbox"
    checkbox.checked = true;
    checkbox.onchange = (checked) => {
      if ((checked.currentTarget as HTMLInputElement).checked) {
        // Remove any existing [ci skip] or [skip ci] tags
        const cleanedValue = prTitleField.value.replace(/^\[ci skip\]\s*|\[skip ci\]\s*/gi, '').trim()
        // Add [ci skip] at the beginning
        prTitleField.value = `[ci skip] ${cleanedValue}`
      } else {
        // Remove [ci skip] or [skip ci] from the beginning
        prTitleField.value = prTitleField.value.replace(/^\[ci skip\]\s*|\[skip ci\]\s*/gi, '').trim()
      }
    }

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
        checkbox.dispatchEvent(new Event('change'));
      }
    };

    // First, find the Confirm merge button
    const confirmBtn = Array.from(document.querySelectorAll('button')).find(
      btn => btn.textContent?.trim() === 'Confirm merge'
    );
    
    console.log('[CI SKIP] Confirm merge button:', confirmBtn);
    
    if (confirmBtn && confirmBtn.parentElement && confirmBtn.parentElement.parentElement) {
      // confirmBtn.parentElement is data-loading-wrapper
      // confirmBtn.parentElement.parentElement is the main flex container
      const loadingWrapper = confirmBtn.parentElement;
      const mainContainer = loadingWrapper.parentElement;
      
      // Find Cancel button in the main container
      const cancelButton = Array.from(mainContainer.querySelectorAll('button')).find(
        btn => btn.textContent?.trim() === 'Cancel'
      );
      
      console.log('[CI SKIP] Loading wrapper:', loadingWrapper);
      console.log('[CI SKIP] Main container:', mainContainer);
      console.log('[CI SKIP] Cancel button:', cancelButton);
      
      if (cancelButton) {
        // Insert CI Skip button after Cancel button
        cancelButton.parentNode?.insertBefore(button, cancelButton.nextSibling);
        console.log('[CI SKIP] CI Skip button inserted after Cancel button');
      } else {
        // Insert after the loading wrapper if Cancel button not found
        loadingWrapper.parentNode?.insertBefore(button, loadingWrapper.nextSibling);
        console.log('[CI SKIP] CI Skip button inserted after loading wrapper');
      }
    } else {
      // Fallback: try to find any flex container with buttons
      const buttonContainer = document.querySelector('.d-flex.gap-2.mt-3') || 
                            document.querySelector('[class*="flex"][class*="gap-2"]');
      
      console.log('[CI SKIP] Fallback button container:', buttonContainer);
      
      if (buttonContainer) {
        buttonContainer.appendChild(button);
        console.log('[CI SKIP] CI Skip button appended to fallback container');
      } else {
        // Final fallback to parent element
        const parentElement = prTitleField.parentElement;
        console.log('[CI SKIP] No button container found, falling back to parent element:', parentElement);
        if (parentElement) {
          parentElement.appendChild(button);
          console.log('[CI SKIP] CI Skip button appended to parent');
        } else {
          console.error('[CI SKIP] Parent element not found!');
        }
      }
    }

    // Add [ci skip] at the beginning if not already present
    const alreadyCiSkip = /^\[ci skip\]|^\[skip ci\]/i.test(prTitleField.value)
    console.log('[CI SKIP] Current value:', prTitleField.value);
    console.log('[CI SKIP] Already has CI skip:', alreadyCiSkip);
    if (!alreadyCiSkip) {
      prTitleField.value = `[ci skip] ${prTitleField.value}`
      console.log('[CI SKIP] Added [ci skip] to title:', prTitleField.value);
    }
  }
}

export const setupObserver = () => {
  console.log('[CI SKIP] setupObserver called');
  // Check if document.body exists before trying to observe it
  if (!document.body) {
    // If body doesn't exist yet, try again after a short delay
    console.log('[CI SKIP] document.body not ready, retrying in 100ms');
    setTimeout(setupObserver, 100);
    return;
  }
  
  // Disconnect existing observer if any
  if (observer) {
    observer.disconnect();
  }

  observer = new MutationObserver((mutations) => {
    console.log('[CI SKIP] MutationObserver triggered, mutations count:', mutations.length);
    
    // Debug: Log what was added
    mutations.forEach((mutation, index) => {
      if (mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            console.log(`[CI SKIP] Added element ${index}:`, element.tagName, 'id:', element.id, 'class:', element.className);
            
            // Check if this element contains any input fields
            const inputs = element.querySelectorAll('input[type="text"], input[type="hidden"], textarea');
            if (inputs.length > 0) {
              console.log('[CI SKIP] Found input fields:', inputs.length);
              inputs.forEach((input, i) => {
                const inputEl = input as HTMLInputElement;
                console.log(`[CI SKIP]   Input ${i}: id="${inputEl.id}", name="${inputEl.name}", value="${inputEl.value?.substring(0, 50)}..."`);
              });
            }
          }
        });
      }
    });
    
    // Try to find the merge title field
    const prTitleField = findMergeTitleField();
    
    if (prTitleField) {
      console.log('[CI SKIP] Merge title field found in DOM mutation, value:', prTitleField.value);
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
  console.log('[CI SKIP] Observer started watching document.body');
}

export const checkAndSetup = () => {
  console.log('[CI SKIP] checkAndSetup called');
  
  const prTitleField = findMergeTitleField();
  console.log('[CI SKIP] Initial check for merge title field:', prTitleField);
  
  if (prTitleField) {
    console.log('[CI SKIP] Field found immediately, calling appender');
    appender();
  } else {
    console.log('[CI SKIP] Field not found, setting up observer');
    setupObserver();
  }
}

export const cleanupObserver = () => {
  if (observer) {
    observer.disconnect();
  }
}