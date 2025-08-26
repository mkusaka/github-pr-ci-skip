import "@testing-library/jest-dom";
import { fakeBrowser } from "@webext-core/fake-browser";
import { afterEach, beforeEach } from "vitest";

// Setup fake browser API
(global as any).chrome = fakeBrowser;

// Auto-cleanup after each test
afterEach(() => {
  fakeBrowser.reset();
  document.body.innerHTML = "";
});

// Reset state before each test
beforeEach(() => {
  fakeBrowser.reset();
});
