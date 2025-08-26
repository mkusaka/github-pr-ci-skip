import { fakeBrowser } from '@webext-core/fake-browser';
import { beforeEach } from 'vitest';

// Setup fake browser API
(global as any).chrome = fakeBrowser;

// Reset state before each test
beforeEach(() => {
  fakeBrowser.reset();
});