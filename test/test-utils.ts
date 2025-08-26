import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";

export interface GitHubPRPageOptions {
  prTitle?: string;
  hasConfirmButton?: boolean;
  hasCancelButton?: boolean;
}

export function setupGitHubPRPage(options: GitHubPRPageOptions = {}) {
  const defaults = {
    prTitle: "Merge pull request #123 from user/branch",
    hasConfirmButton: true,
    hasCancelButton: true,
  };

  const config = { ...defaults, ...options };

  document.body.innerHTML = `
    <div class="merge-dialog">
      <label for="commit-msg">Commit message</label>
      <input id="commit-msg" type="text" value="${config.prTitle}" />
      <div class="d-flex gap-2 mt-3">
        ${config.hasConfirmButton ? "<button>Confirm merge</button>" : ""}
        ${config.hasCancelButton ? "<button>Cancel</button>" : ""}
      </div>
    </div>
  `;

  return {
    getCommitInput: () =>
      screen.getByLabelText("Commit message") as HTMLInputElement,
    getConfirmButton: () =>
      screen.queryByRole("button", { name: "Confirm merge" }),
    getCancelButton: () => screen.queryByRole("button", { name: "Cancel" }),
    getCISkipCheckbox: () =>
      screen.queryByRole("checkbox", { name: /CI Skip/i }),
    getCISkipButton: () => screen.queryByRole("button", { name: /CI Skip/i }),
  };
}

export async function toggleCISkip() {
  const checkbox = await screen.findByRole("checkbox", { name: /CI Skip/i });
  await userEvent.click(checkbox);
}

export function createGitHubMergeDialog(
  options: { prTitle?: string; hasLabel?: boolean } = {},
) {
  const {
    prTitle = "Merge pull request #123 from user/branch",
    hasLabel = true,
  } = options;

  if (hasLabel) {
    document.body.innerHTML = `
      <div class="bgColor-muted">
        <label for="merge-input">Commit message</label>
        <input id="merge-input" type="text" value="${prTitle}" data-component="input" />
        <div class="d-flex gap-2 mt-3">
          <button>Confirm merge</button>
          <button>Cancel</button>
        </div>
      </div>
    `;
  } else {
    document.body.innerHTML = `
      <div class="bgColor-muted">
        <input type="text" value="${prTitle}" data-component="input" />
        <div class="d-flex gap-2 mt-3">
          <button>Confirm merge</button>
          <button>Cancel</button>
        </div>
      </div>
    `;
  }
}
