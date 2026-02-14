# github-pr-ci-skip

A Chrome extension that automatically prepends `[ci skip]` to the merge commit title on GitHub pull requests.

When the merge confirmation dialog appears, the commit title is prefixed with `[ci skip]` and a toggle button lets you turn it on or off.

## Features

- Detects the PR merge confirmation dialog and auto-prepends `[ci skip]` to the commit title
- Toggle "CI Skip" on/off via a checkbox button in the merge dialog
- Works with all merge strategies: Merge, Squash and merge, Rebase and merge
- Follows GitHub's SPA navigation (pjax / Turbo)

## Install

Install from the [Chrome Web Store](https://chrome.google.com/webstore/detail/github-pr-ci-skip/dceoaejfgfblnbingdnmhnjepdoicihf?hl=ja&authuser=0).

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) v24+
- [pnpm](https://pnpm.io/) v10+

### Setup

```bash
pnpm install
```

### Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Build in watch mode |
| `pnpm build` | Production build (outputs to `dist/`) |
| `pnpm test` | Run tests (vitest, watch mode) |
| `pnpm test:run` | Run tests once |
| `pnpm test:ui` | Run tests with Vitest UI |
| `pnpm test:coverage` | Run tests with coverage |
| `pnpm typecheck` | TypeScript type check |
| `pnpm lint` | Lint with oxlint |
| `pnpm lint:fix` | Lint with auto-fix |
| `pnpm format` | Format with Prettier |
| `pnpm format:check` | Check formatting |
| `pnpm package` | Generate `package.zip` for Chrome Web Store |

### Load unpacked extension

1. Run `pnpm build`
2. Open `chrome://extensions` in Chrome
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `dist/` directory

### Tech Stack

- **TypeScript**
- **Vite** + **@crxjs/vite-plugin** — Chrome extension build (Manifest V3)
- **Vitest** + **happy-dom** — Testing
- **oxlint** — Linter
- **Prettier** — Formatter

## License

[MIT](./LICENSE)
