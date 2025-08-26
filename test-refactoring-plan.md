# Test Infrastructure Refactoring Plan

## Executive Summary

This document outlines a comprehensive refactoring strategy for the test infrastructure of the GitHub PR CI Skip browser extension. The primary goal is to eliminate manual DOM mocking in favor of leveraging existing testing libraries and proper environment configuration.

## Current State Analysis

### Problems Identified

1. **Manual DOM API Mocking**
   - Extensive manual mocking of `document.querySelector`, `document.createElement`, `document.getElementById`
   - Complex state management with manual tracking of created elements
   - Brittle tests that break when DOM implementation changes

2. **MutationObserver Manual Implementation**
   - Custom mock implementation with callback tracking
   - Manual state management for observer instances
   - Difficult to maintain and debug

3. **Underutilized Dependencies**
   - `happy-dom` and `jsdom` installed but not configured
   - `@testing-library/dom` installed but not used effectively
   - `@webext-core/fake-browser` already available for Chrome API mocking

4. **Code Duplication**
   - Repeated setup logic across tests
   - Similar mocking patterns duplicated
   - No shared test utilities

## Proposed Architecture

### 1. Environment Configuration

#### Vitest Configuration (`vitest.config.ts`)
```typescript
import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom', // Faster than jsdom for our use case
    setupFiles: ['./test/vitest.setup.ts'],
    include: ['test/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'test/**', '*.config.*']
    }
  },
  // Keep existing build config for extension
  build: {
    // ... existing config
  }
});
```

**Rationale:**
- `happy-dom` provides faster test execution than `jsdom` while offering sufficient DOM API coverage
- Native MutationObserver, querySelector, createElement become available without mocking
- Global test functions eliminate import boilerplate

### 2. Centralized Test Setup

#### Enhanced Setup File (`test/vitest.setup.ts`)
```typescript
import '@testing-library/jest-dom'; // Custom matchers
import { fakeBrowser } from '@webext-core/fake-browser';
import { cleanup } from '@testing-library/dom';
import { afterEach, beforeEach } from 'vitest';

// Chrome API mock (already in use, just enhance)
global.chrome = fakeBrowser;

// Auto-cleanup after each test
afterEach(() => {
  cleanup();
  fakeBrowser.reset();
  document.body.innerHTML = '';
});

// Common test utilities
global.createMockPRPage = () => {
  // Shared mock page structure
};
```

**Benefits:**
- Automatic cleanup prevents test pollution
- Chrome APIs consistently mocked
- Shared utilities reduce duplication

### 3. Testing Library Integration

#### Migration Strategy

**Before (Manual Mocking):**
```typescript
vi.spyOn(document, 'querySelector').mockImplementation((selector: string) => {
  if (selector.includes('input[type="text"]')) {
    return mockPrTitleField;
  }
  // ... more conditions
});
```

**After (Testing Library):**
```typescript
import { screen, waitFor, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';

// Setup DOM
document.body.innerHTML = `
  <div>
    <label for="commit-message">Commit message</label>
    <input id="commit-message" type="text" value="Merge pull request #123" />
    <button>Confirm merge</button>
    <button>Cancel</button>
  </div>
`;

// Query elements naturally
const input = screen.getByLabelText('Commit message');
const confirmButton = screen.getByRole('button', { name: 'Confirm merge' });

// Interact naturally
await userEvent.click(confirmButton);
```

**Advantages:**
- More readable and maintainable tests
- Queries match how users interact with the page
- Built-in async utilities for dynamic content
- No manual spy management

### 4. Test Helper Functions

#### Create Reusable Test Utilities (`test/test-utils.ts`)
```typescript
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';

export function setupGitHubPRPage(options = {}) {
  const defaults = {
    prTitle: 'Merge pull request #123 from user/branch',
    hasConfirmButton: true,
    hasCancelButton: true
  };
  
  const config = { ...defaults, ...options };
  
  document.body.innerHTML = `
    <div class="merge-dialog">
      <label for="commit-msg">Commit message</label>
      <input id="commit-msg" type="text" value="${config.prTitle}" />
      <div class="d-flex gap-2 mt-3">
        ${config.hasConfirmButton ? '<button>Confirm merge</button>' : ''}
        ${config.hasCancelButton ? '<button>Cancel</button>' : ''}
      </div>
    </div>
  `;
  
  return {
    getCommitInput: () => screen.getByLabelText('Commit message'),
    getConfirmButton: () => screen.queryByRole('button', { name: 'Confirm merge' }),
    getCancelButton: () => screen.queryByRole('button', { name: 'Cancel' }),
    getCISkipCheckbox: () => screen.queryByRole('checkbox', { name: /CI Skip/i })
  };
}

export async function toggleCISkip() {
  const checkbox = await screen.findByRole('checkbox', { name: /CI Skip/i });
  await userEvent.click(checkbox);
}
```

### 5. MutationObserver Testing

#### Natural MutationObserver Testing
```typescript
import { waitFor } from '@testing-library/dom';

test('observes DOM changes and adds CI skip checkbox', async () => {
  // Initial empty state
  document.body.innerHTML = '<div id="root"></div>';
  
  // Start observer
  checkAndSetup();
  
  // Simulate GitHub dynamically adding the merge dialog
  const root = document.getElementById('root');
  root.innerHTML = `
    <label for="commit-msg">Commit message</label>
    <input id="commit-msg" type="text" value="Merge pull request #123" />
  `;
  
  // Wait for observer to react
  await waitFor(() => {
    expect(screen.getByRole('checkbox', { name: /CI Skip/i })).toBeInTheDocument();
  });
});
```

**Key Improvements:**
- Real MutationObserver from happy-dom
- No manual callback tracking
- Natural async testing patterns

## Implementation Phases

### Phase 1: Infrastructure Setup (Week 1)
1. Create `vitest.config.ts` with happy-dom environment
2. Enhance `test/vitest.setup.ts` with proper cleanup
3. Verify all existing tests still pass

### Phase 2: Test Utilities Creation (Week 1-2)
1. Create `test/test-utils.ts` with helper functions
2. Document common testing patterns
3. Create example test showcasing new patterns

### Phase 3: Gradual Migration (Week 2-3)
1. Start with `simple.test.ts` as proof of concept
2. Refactor `content.test.ts` using new utilities
3. Remove manual mocks progressively

### Phase 4: Documentation & Cleanup (Week 3)
1. Document testing best practices
2. Remove unused mocking code
3. Update CI pipeline if needed

## Migration Example

### Current Test (Manual Mocking)
```typescript
describe('Content Script', () => {
  let mockPrTitleField: HTMLInputElement;
  let mockCheckbox: HTMLInputElement | null = null;
  
  beforeEach(() => {
    // 70+ lines of manual mock setup...
  });
  
  it('should add [ci skip] to PR title', () => {
    appender();
    expect(mockPrTitleField.value).toBe('[ci skip] Merge pull request #123');
  });
});
```

### Refactored Test (Testing Library)
```typescript
describe('Content Script', () => {
  it('should add [ci skip] to PR title', async () => {
    const { getCommitInput } = setupGitHubPRPage();
    
    appender();
    
    expect(getCommitInput()).toHaveValue('[ci skip] Merge pull request #123 from user/branch');
  });
  
  it('should toggle CI skip prefix when checkbox changes', async () => {
    const { getCommitInput } = setupGitHubPRPage();
    
    appender();
    await toggleCISkip(); // Uncheck
    
    expect(getCommitInput()).toHaveValue('Merge pull request #123 from user/branch');
    
    await toggleCISkip(); // Check again
    
    expect(getCommitInput()).toHaveValue('[ci skip] Merge pull request #123 from user/branch');
  });
});
```

## Benefits & ROI

### Immediate Benefits
- **50-70% reduction** in test code volume
- **Improved readability** - tests describe user behavior, not implementation
- **Faster test execution** with happy-dom vs manual mocking
- **Better debugging** - real DOM errors instead of mock failures

### Long-term Benefits
- **Easier onboarding** for new contributors
- **Reduced maintenance** - no mock updates when DOM APIs change
- **Better coverage** - easier to write comprehensive tests
- **Confidence** - tests reflect real-world usage

## Risk Mitigation

### Potential Risks
1. **Breaking existing tests** → Mitigate with gradual migration
2. **Learning curve** → Provide examples and documentation
3. **Different behavior** → Validate critical paths remain tested

### Rollback Strategy
- Keep old test files during migration
- Version control allows easy reversion
- Parallel test suites during transition

## Success Metrics

- [ ] All tests passing with new infrastructure
- [ ] Test execution time reduced by >30%
- [ ] Code coverage maintained or improved
- [ ] Zero manual DOM API mocks remaining
- [ ] Developer satisfaction improved

## Note on Chrome Extension APIs

The current setup with `@webext-core/fake-browser` is excellent and should be retained. It provides:
- Comprehensive Chrome API mocking
- Type-safe mocks matching the Chrome API
- Easy reset between tests
- Good integration with Vitest

No need to switch to `vitest-chrome` or other alternatives - the current solution is optimal.

## Conclusion

This refactoring will transform the test suite from a brittle, mock-heavy implementation to a robust, maintainable testing infrastructure that leverages modern testing best practices. The investment will pay dividends in reduced maintenance burden and increased developer productivity.