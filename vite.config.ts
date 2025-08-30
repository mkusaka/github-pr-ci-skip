/// <reference types="vitest" />
import { defineConfig, Plugin } from "vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./src/manifest";

// Shim for Vitest + Vite 7: provide '/@vite/env' virtual module
const vitestEnvShim = (): Plugin => ({
  name: "vitest-env-shim",
  enforce: "pre",
  resolveId(id) {
    if (id === "/@vite/env") return id;
  },
  load(id) {
    if (id === "/@vite/env") {
      // Minimal env export compatible with Vite expectations
      return `export const DEV = false;\nexport const PROD = true;\nexport const SSR = false;\nexport const MODE = 'test';\nexport const BASE_URL = '/';\nexport default { DEV, PROD, SSR, MODE, BASE_URL };`;
    }
  },
});

export default defineConfig(({ mode }) => ({
  // In test mode, avoid CRX plugin and inject env shim
  plugins: mode === "test" ? [vitestEnvShim()] : [crx({ manifest })],
  resolve: {
    alias:
      mode === "test"
        ? {
            "/@vite/env": new URL("./test/shims/vite-env.ts", import.meta.url)
              .pathname,
          }
        : {},
  },
  build: {
    sourcemap: true,
    minify: false,
  },
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./test/test-setup.ts"],
  },
}));
