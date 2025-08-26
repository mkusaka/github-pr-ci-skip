import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { appender, checkAndSetup, setupObserver, cleanupObserver } from './content';

describe('Content Script', () => {
  let mockPrTitleField: HTMLInputElement;
  let mockCheckbox: HTMLInputElement | null = null;
  
  beforeEach(() => {
    // Reset checkbox
    mockCheckbox = null;
    
    // Create mock parent element
    const parentElement = document.createElement('div');
    
    // Create mock PR title field
    mockPrTitleField = document.createElement('input');
    mockPrTitleField.id = 'merge_title_field';
    mockPrTitleField.value = 'Test PR';
    
    // Append the PR title field to the parent
    parentElement.appendChild(mockPrTitleField);
    
    // Mock getElementById
    vi.spyOn(document, 'getElementById').mockImplementation((id: string) => {
      if (id === 'merge_title_field') {
        return mockPrTitleField;
      }
      if (id === 'skip_ci_checkbox') {
        return mockCheckbox;
      }
      return null;
    });
    
    // Store original createElement
    const originalCreateElement = document.createElement.bind(document);
    
    // Mock createElement to track checkbox creation
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'input' && !mockCheckbox) {
        mockCheckbox = element as HTMLInputElement;
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
  });

  describe('appender', () => {
    it('should add [ci skip] to PR title when field exists', () => {
      appender();
      
      expect(mockPrTitleField.value).toBe('Test PR [ci skip]');
    });

    it('should create checkbox toggle when PR title field exists', () => {
      appender();
      
      expect(mockCheckbox).toBeTruthy();
      expect(mockCheckbox?.type).toBe('checkbox');
      expect(mockCheckbox?.id).toBe('skip_ci_checkbox');
      expect(mockCheckbox?.checked).toBe(true);
    });

    it('should create label for checkbox', () => {
      appender();
      
      const parentElement = mockPrTitleField.parentElement;
      expect(parentElement).toBeTruthy();
      
      const appendChildSpy = parentElement!.appendChild as any;
      expect(appendChildSpy).toHaveBeenCalled();
      
      // Check if a label was appended
      const appendedElements = appendChildSpy.mock.calls.map((call: any[]) => call[0]);
      const label = appendedElements.find((el: any) => el.tagName === 'LABEL');
      expect(label).toBeTruthy();
      expect(label.innerText).toBe(' ci skip toggle ');
    });

    it('should not add [ci skip] if already present', () => {
      mockPrTitleField.value = 'Test PR [ci skip]';
      
      appender();
      
      expect(mockPrTitleField.value).toBe('Test PR [ci skip]');
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
      
      // Should not append new label
      const appendChildSpy = mockPrTitleField.parentElement!.appendChild as any;
      expect(appendChildSpy).not.toHaveBeenCalled();
    });

    it('should handle checkbox toggle correctly', () => {
      appender();
      
      // Get the checkbox onchange handler
      const onchangeHandler = mockCheckbox!.onchange;
      expect(onchangeHandler).toBeTruthy();
      
      // Simulate unchecking
      mockCheckbox!.checked = false;
      const uncheckEvent = new Event('change');
      Object.defineProperty(uncheckEvent, 'currentTarget', {
        value: mockCheckbox,
        writable: false
      });
      onchangeHandler!.call(mockCheckbox!, uncheckEvent);
      
      expect(mockPrTitleField.value).toBe('Test PR');
      
      // Simulate checking again
      mockCheckbox!.checked = true;
      const checkEvent = new Event('change');
      Object.defineProperty(checkEvent, 'currentTarget', {
        value: mockCheckbox,
        writable: false
      });
      onchangeHandler!.call(mockCheckbox!, checkEvent);
      
      expect(mockPrTitleField.value).toBe('Test PR [ci skip]');
    });
  });

  describe('checkAndSetup', () => {
    it('should call appender when PR title field exists', () => {
      checkAndSetup();
      
      // Check the result of appender being called
      expect(mockPrTitleField.value).toBe('Test PR [ci skip]');
    });

    it('should setup observer when PR title field does not exist', () => {
      vi.spyOn(document, 'getElementById').mockReturnValue(null);
      
      const observeSpy = vi.fn();
      const MutationObserverMock = vi.fn().mockImplementation(() => ({
        observe: observeSpy,
        disconnect: vi.fn(),
        takeRecords: vi.fn(() => [])
      }));
      global.MutationObserver = MutationObserverMock as any;
      
      checkAndSetup();
      
      expect(MutationObserverMock).toHaveBeenCalled();
      expect(observeSpy).toHaveBeenCalledWith(document.body, {
        childList: true,
        subtree: true
      });
    });
  });

  describe('setupObserver', () => {
    it('should create and configure MutationObserver', () => {
      const observeSpy = vi.fn();
      const disconnectSpy = vi.fn();
      const MutationObserverMock = vi.fn().mockImplementation(() => ({
        observe: observeSpy,
        disconnect: disconnectSpy,
        takeRecords: vi.fn(() => [])
      }));
      global.MutationObserver = MutationObserverMock as any;
      
      setupObserver();
      
      expect(MutationObserverMock).toHaveBeenCalled();
      expect(observeSpy).toHaveBeenCalledWith(document.body, {
        childList: true,
        subtree: true
      });
    });

    it('should call appender when PR title field appears', () => {
      let observerCallback: MutationCallback;
      const MutationObserverMock = vi.fn().mockImplementation((callback) => {
        observerCallback = callback;
        return {
          observe: vi.fn(),
          disconnect: vi.fn(),
          takeRecords: vi.fn(() => [])
        };
      });
      global.MutationObserver = MutationObserverMock as any;
      
      setupObserver();
      
      // Simulate PR title field appearing
      observerCallback!([], {} as MutationObserver);
      
      expect(mockPrTitleField.value).toBe('Test PR [ci skip]');
    });

    it('should disconnect existing observer before creating new one', () => {
      const disconnectSpy = vi.fn();
      const MutationObserverMock = vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        disconnect: disconnectSpy,
        takeRecords: vi.fn(() => [])
      }));
      global.MutationObserver = MutationObserverMock as any;
      
      // Setup first observer
      setupObserver();
      
      // Setup second observer
      setupObserver();
      
      expect(disconnectSpy).toHaveBeenCalled();
    });
  });

  describe('cleanupObserver', () => {
    it('should disconnect observer if it exists', () => {
      const disconnectSpy = vi.fn();
      const MutationObserverMock = vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        disconnect: disconnectSpy,
        takeRecords: vi.fn(() => [])
      }));
      global.MutationObserver = MutationObserverMock as any;
      
      // Setup observer first
      setupObserver();
      
      // Clean up
      cleanupObserver();
      
      expect(disconnectSpy).toHaveBeenCalled();
    });

    it('should handle case when observer does not exist', () => {
      // Should not throw
      expect(() => cleanupObserver()).not.toThrow();
    });
  });
});