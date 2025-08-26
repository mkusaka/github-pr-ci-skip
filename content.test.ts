import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { appender, setupObserver, checkAndSetup, cleanupObserver } from './content-logic';

describe('Content Script', () => {
  let mockPrTitleField: HTMLInputElement;
  let mockCheckbox: HTMLInputElement | null = null;
  let mockButton: HTMLButtonElement | null = null;
  
  beforeEach(() => {
    // Reset checkbox and button
    mockCheckbox = null;
    mockButton = null;
    
    // Create mock parent element
    const parentElement = document.createElement('div');
    
    // Create mock PR title field
    mockPrTitleField = document.createElement('input');
    mockPrTitleField.type = 'text';
    mockPrTitleField.value = 'Merge pull request #123 from user/branch';
    
    // Append the PR title field to the parent
    parentElement.appendChild(mockPrTitleField);
    
    // Mock querySelector to return the PR title field
    vi.spyOn(document, 'querySelector').mockImplementation((selector: string) => {
      if (selector.includes('input[type="text"]')) {
        return mockPrTitleField;
      }
      if (selector.includes('.d-flex.gap-2.mt-3')) {
        return null;
      }
      if (selector.includes('[class*="flex"][class*="gap-2"]')) {
        return null;
      }
      return null;
    });
    
    // Mock querySelectorAll for label and button search
    vi.spyOn(document, 'querySelectorAll').mockImplementation((selector: string) => {
      if (selector === 'label') {
        return [] as any;
      }
      if (selector === 'button') {
        return [] as any;
      }
      return [] as any;
    });
    
    // Mock getElementById
    vi.spyOn(document, 'getElementById').mockImplementation((id: string) => {
      if (id === 'skip_ci_checkbox') {
        return mockCheckbox;
      }
      return null;
    });
    
    // Store original createElement
    const originalCreateElement = document.createElement.bind(document);
    
    // Mock createElement to track element creation
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'input' && !mockCheckbox) {
        // Track the first input element created (which will be our checkbox)
        mockCheckbox = element as HTMLInputElement;
      }
      if (tagName === 'button' && !mockButton) {
        mockButton = element as HTMLButtonElement;
      }
      return element;
    });
    
    // Mock appendChild on the parent
    vi.spyOn(parentElement, 'appendChild');
    
    // Mock console.log to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    mockCheckbox = null;
    mockButton = null;
  });

  describe('appender', () => {
    it('should add [ci skip] to PR title when field exists', () => {
      appender();
      
      expect(mockPrTitleField.value).toBe('[ci skip] Merge pull request #123 from user/branch');
    });

    it('should create checkbox toggle when PR title field exists', () => {
      appender();
      
      // The checkbox should be created and have correct properties
      expect(mockCheckbox).toBeTruthy();
      expect(mockCheckbox?.type).toBe('checkbox');
      expect(mockCheckbox?.id).toBe('skip_ci_checkbox');
      expect(mockCheckbox?.checked).toBe(true);
    });

    it('should create button with checkbox', () => {
      appender();
      
      expect(mockButton).toBeTruthy();
      expect(mockButton?.type).toBe('button');
      expect(mockButton?.className).toBe('btn btn-sm ml-1');
    });

    it('should not add [ci skip] if already present', () => {
      mockPrTitleField.value = '[ci skip] Merge pull request #123 from user/branch';
      
      appender();
      
      expect(mockPrTitleField.value).toBe('[ci skip] Merge pull request #123 from user/branch');
    });

    it('should not recreate checkbox if it already exists', () => {
      // Create existing checkbox
      const existingCheckbox = document.createElement('input');
      existingCheckbox.type = 'checkbox';
      existingCheckbox.id = 'skip_ci_checkbox';
      existingCheckbox.checked = false;
      mockCheckbox = existingCheckbox;
      
      appender();
      
      // Should set checked to true
      expect(existingCheckbox.checked).toBe(true);
      
      // Should not create new button
      expect(mockButton).toBeFalsy();
    });

    it('should handle checkbox toggle correctly', () => {
      appender();
      
      const onchangeHandler = mockCheckbox?.onchange;
      expect(onchangeHandler).toBeTruthy();
      
      // Test unchecking
      const event1 = { currentTarget: { checked: false } } as any;
      onchangeHandler!(event1);
      expect(mockPrTitleField.value).toBe('Merge pull request #123 from user/branch');
      
      // Test checking again
      const event2 = { currentTarget: { checked: true } } as any;
      onchangeHandler!(event2);
      expect(mockPrTitleField.value).toBe('[ci skip] Merge pull request #123 from user/branch');
    });
  });

  describe('checkAndSetup', () => {
    it('should call appender when PR title field exists', () => {
      checkAndSetup();
      
      // Check the result of appender being called
      expect(mockPrTitleField.value).toBe('[ci skip] Merge pull request #123 from user/branch');
    });

    it('should setup observer when PR title field does not exist', () => {
      // Make querySelector return null
      vi.spyOn(document, 'querySelector').mockReturnValue(null);
      
      const observeSpy = vi.fn();
      global.MutationObserver = vi.fn().mockImplementation(() => ({
        observe: observeSpy,
        disconnect: vi.fn(),
      }));
      
      checkAndSetup();
      
      expect(observeSpy).toHaveBeenCalledWith(document.body, {
        childList: true,
        subtree: true
      });
    });
  });

  describe('setupObserver', () => {
    beforeEach(() => {
      global.MutationObserver = vi.fn().mockImplementation((callback) => ({
        observe: vi.fn(),
        disconnect: vi.fn(),
      }));
    });

    it('should create and configure MutationObserver', () => {
      setupObserver();
      
      expect(global.MutationObserver).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should retry if document.body is not ready', () => {
      const originalBody = document.body;
      Object.defineProperty(document, 'body', {
        get: () => null,
        configurable: true,
      });
      
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
      
      setupObserver();
      
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 100);
      
      Object.defineProperty(document, 'body', {
        get: () => originalBody,
        configurable: true,
      });
    });

    it('should call appender when PR title field appears', () => {
      let observerCallback: MutationCallback | null = null;
      
      global.MutationObserver = vi.fn().mockImplementation((callback) => {
        observerCallback = callback;
        return {
          observe: vi.fn(),
          disconnect: vi.fn(),
        };
      });
      
      setupObserver();
      
      // Simulate DOM mutation
      observerCallback!([], {} as MutationObserver);
      
      expect(mockPrTitleField.value).toBe('[ci skip] Merge pull request #123 from user/branch');
    });

    it('should disconnect existing observer before creating new one', () => {
      const disconnectSpy = vi.fn();
      global.MutationObserver = vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        disconnect: disconnectSpy,
      }));
      
      // First call to create observer
      setupObserver();
      
      // Second call should disconnect first observer
      setupObserver();
      
      expect(disconnectSpy).toHaveBeenCalled();
    });
  });

  describe('cleanupObserver', () => {
    it('should disconnect observer if it exists', () => {
      const disconnectSpy = vi.fn();
      global.MutationObserver = vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        disconnect: disconnectSpy,
      }));
      
      setupObserver();
      cleanupObserver();
      
      expect(disconnectSpy).toHaveBeenCalled();
    });

    it('should handle case when observer does not exist', () => {
      // Should not throw error
      expect(() => cleanupObserver()).not.toThrow();
    });
  });
});