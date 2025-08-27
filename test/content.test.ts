import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import {
  appender,
  setupObserver,
  checkAndSetup,
  cleanupObserver,
} from "../src/content-logic";
import { setupGitHubPRPage, createGitHubMergeDialog } from "./test-utils";

describe("Content Script", () => {
  describe("appender", () => {
    it("should add [ci skip] to PR title when field exists", () => {
      const { getCommitInput } = setupGitHubPRPage();

      appender();

      const input = getCommitInput();
      expect(input).toHaveValue(
        "[ci skip] Merge pull request #123 from user/branch",
      );
    });

    it("should create CI Skip button with checkbox", () => {
      setupGitHubPRPage();

      appender();

      // Check button exists
      const button = screen.getByRole("button", { name: /CI Skip/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass("btn", "btn-sm", "ml-1");

      // Check checkbox exists inside button
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toBeChecked();
    });

    it("should position CI Skip button after Cancel button", () => {
      setupGitHubPRPage();

      appender();

      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      const ciSkipButton = screen.getByRole("button", { name: /CI Skip/i });

      // Check that CI Skip button comes after Cancel button
      const allButtons = screen.getAllByRole("button");
      const cancelIndex = allButtons.indexOf(cancelButton);
      const ciSkipIndex = allButtons.indexOf(ciSkipButton);

      expect(ciSkipIndex).toBeGreaterThan(cancelIndex);
    });

    it("should not add [ci skip] if already present", () => {
      const { getCommitInput } = setupGitHubPRPage({
        prTitle: "[ci skip] Merge pull request #123 from user/branch",
      });

      appender();

      const input = getCommitInput();
      expect(input).toHaveValue(
        "[ci skip] Merge pull request #123 from user/branch",
      );
    });

    it("should not recreate checkbox if it already exists", () => {
      setupGitHubPRPage();

      // First call creates the checkbox
      appender();
      const firstCheckbox = screen.getByRole("checkbox");

      // Second call should not recreate
      appender();
      const secondCheckbox = screen.getByRole("checkbox");

      // Should be the same element
      expect(firstCheckbox).toBe(secondCheckbox);
      expect(secondCheckbox).toBeChecked();
    });

    it("should handle checkbox toggle correctly", async () => {
      const { getCommitInput } = setupGitHubPRPage();
      const user = userEvent.setup();

      appender();

      const checkbox = screen.getByRole("checkbox");
      const input = getCommitInput();

      // Initial state - checked with [ci skip]
      expect(checkbox).toBeChecked();
      expect(input).toHaveValue(
        "[ci skip] Merge pull request #123 from user/branch",
      );

      // Uncheck - removes [ci skip]
      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
      expect(input).toHaveValue("Merge pull request #123 from user/branch");

      // Check again - adds [ci skip] back
      await user.click(checkbox);
      expect(checkbox).toBeChecked();
      expect(input).toHaveValue(
        "[ci skip] Merge pull request #123 from user/branch",
      );
    });

    it("should handle clicking the button (not checkbox) correctly", async () => {
      setupGitHubPRPage();
      const user = userEvent.setup();

      appender();

      const button = screen.getByRole("button", { name: /CI Skip/i });
      const checkbox = screen.getByRole("checkbox");

      // Initial state
      expect(checkbox).toBeChecked();

      // Click the button (not the checkbox directly)
      await user.click(button);

      // Should toggle the checkbox
      expect(checkbox).not.toBeChecked();
    });

    it("should work with different selector strategies", () => {
      // Test with label-based selection
      createGitHubMergeDialog({ hasLabel: true });
      appender();

      const input = screen.getByLabelText("Commit message") as HTMLInputElement;
      expect(input).toHaveValue(
        "[ci skip] Merge pull request #123 from user/branch",
      );

      // Clean up for next test
      document.body.innerHTML = "";

      // Test without label (data-component selector)
      createGitHubMergeDialog({ hasLabel: false });
      appender();

      const inputNoLabel = document.querySelector(
        'input[data-component="input"]',
      ) as HTMLInputElement;
      expect(inputNoLabel).toHaveValue(
        "[ci skip] Merge pull request #123 from user/branch",
      );
    });
  });

  describe("checkAndSetup", () => {
    beforeEach(() => {
      // Mock window.location.pathname to be a PR page
      Object.defineProperty(window, "location", {
        writable: true,
        value: { pathname: "/owner/repo/pull/123" },
      });
    });

    it("should call appender when PR title field exists on PR page", () => {
      setupGitHubPRPage();

      checkAndSetup();

      // Verify appender was called by checking its effects
      const input = screen.getByLabelText("Commit message") as HTMLInputElement;
      expect(input).toHaveValue(
        "[ci skip] Merge pull request #123 from user/branch",
      );
    });

    it("should setup observer when PR title field does not exist on PR page", () => {
      // Start with empty DOM
      document.body.innerHTML = "";

      const observeSpy = vi.spyOn(MutationObserver.prototype, "observe");

      checkAndSetup();

      expect(observeSpy).toHaveBeenCalledWith(document.body, {
        childList: true,
        subtree: true,
      });

      observeSpy.mockRestore();
    });

    it("should not setup observer on non-PR pages", () => {
      // Mock non-PR page
      Object.defineProperty(window, "location", {
        writable: true,
        value: { pathname: "/owner/repo/issues/123" },
      });

      setupGitHubPRPage();
      const observeSpy = vi.spyOn(MutationObserver.prototype, "observe");

      checkAndSetup();

      expect(observeSpy).not.toHaveBeenCalled();

      // Verify appender was not called
      const input = screen.getByLabelText("Commit message") as HTMLInputElement;
      expect(input).toHaveValue("Merge pull request #123 from user/branch");

      observeSpy.mockRestore();
    });
  });

  describe("setupObserver", () => {
    it("should observe DOM changes and add CI skip when merge dialog appears", async () => {
      // Start with empty DOM
      document.body.innerHTML = '<div id="root"></div>';

      // Start observing
      setupObserver();

      // Simulate GitHub dynamically adding the merge dialog
      const root = document.getElementById("root")!;
      root.innerHTML = `
        <label for="commit-msg">Commit message</label>
        <input id="commit-msg" type="text" value="Merge pull request #123 from user/branch" />
        <div class="d-flex gap-2 mt-3">
          <button>Confirm merge</button>
          <button>Cancel</button>
        </div>
      `;

      // Wait for observer to react
      await waitFor(() => {
        const checkbox = screen.getByRole("checkbox");
        expect(checkbox).toBeInTheDocument();
      });

      // Verify the input was updated
      const input = screen.getByLabelText("Commit message") as HTMLInputElement;
      expect(input).toHaveValue(
        "[ci skip] Merge pull request #123 from user/branch",
      );
    });

    it("should handle document.body not being ready", () => {
      const originalBody = document.body;
      Object.defineProperty(document, "body", {
        get: () => null,
        configurable: true,
      });

      const setTimeoutSpy = vi.spyOn(global, "setTimeout");

      setupObserver();

      // Should retry after 100ms
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 100);

      // Restore
      Object.defineProperty(document, "body", {
        get: () => originalBody,
        configurable: true,
      });
      setTimeoutSpy.mockRestore();
    });

    it("should disconnect existing observer before creating new one", () => {
      const disconnectSpy = vi.spyOn(MutationObserver.prototype, "disconnect");

      // First call
      setupObserver();

      // Second call should disconnect the first
      setupObserver();

      expect(disconnectSpy.mock.calls.length).toBeGreaterThanOrEqual(1);

      disconnectSpy.mockRestore();
    });
  });

  describe("cleanupObserver", () => {
    it("should disconnect observer if it exists", () => {
      const disconnectSpy = vi.spyOn(MutationObserver.prototype, "disconnect");

      // Setup an observer first
      setupObserver();

      // Clean it up
      cleanupObserver();

      expect(disconnectSpy).toHaveBeenCalled();

      disconnectSpy.mockRestore();
    });

    it("should handle case when observer does not exist", () => {
      // Should not throw even without an observer
      expect(() => cleanupObserver()).not.toThrow();
    });
  });
});
