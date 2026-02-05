import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";

export interface GitHubPRPageOptions {
  prTitle?: string;
  hasConfirmButton?: boolean;
  hasCancelButton?: boolean;
  prcStyle?: boolean;
  confirmButtonText?: string;
}

export function setupGitHubPRPage(options: GitHubPRPageOptions = {}) {
  const defaults = {
    prTitle: "Merge pull request #123 from user/branch",
    hasConfirmButton: true,
    hasCancelButton: true,
    prcStyle: false,
    confirmButtonText: "Confirm merge",
  };

  const config = { ...defaults, ...options };

  if (config.prcStyle) {
    document.body.innerHTML = `
      <div class="pr-p-3 bgColor-muted borderColor-muted rounded-2">
        <div>
          <div data-has-label="" class="prc-FormControl-ControlVerticalLayout-8YotI">
            <label for="commit-msg" class="prc-components-Label-2mrqP">Commit message</label>
            <span class="TextInput-wrapper prc-components-TextInputWrapper-Hpdqi" data-block="true">
              <input id="commit-msg" data-component="input" class="prc-components-Input-IwWrt" type="text" value="${config.prTitle}" />
            </span>
          </div>
          <div class="d-flex flex-sm-items-center flex-column flex-sm-row gap-2 pr-mt-3">
            ${config.hasConfirmButton ? `<div data-loading-wrapper="true"><button type="button" class="prc-Button-ButtonBase-9n-Xk" data-variant="danger"><span data-component="buttonContent"><span data-component="text">${config.confirmButtonText}</span></span></button></div>` : ""}
            ${config.hasCancelButton ? `<button type="button" class="prc-Button-ButtonBase-9n-Xk" data-variant="default"><span data-component="buttonContent"><span data-component="text">Cancel</span></span></button>` : ""}
          </div>
        </div>
      </div>
    `;
  } else {
    document.body.innerHTML = `
      <div class="merge-dialog">
        <label for="commit-msg">Commit message</label>
        <input id="commit-msg" type="text" value="${config.prTitle}" />
        <div class="d-flex gap-2 mt-3">
          ${config.hasConfirmButton ? `<button>${config.confirmButtonText}</button>` : ""}
          ${config.hasCancelButton ? "<button>Cancel</button>" : ""}
        </div>
      </div>
    `;
  }

  return {
    getCommitInput: () =>
      screen.getByLabelText("Commit message") as HTMLInputElement,
    getConfirmButton: () =>
      screen.queryByRole("button", {
        name: new RegExp(
          config.confirmButtonText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        ),
      }),
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
