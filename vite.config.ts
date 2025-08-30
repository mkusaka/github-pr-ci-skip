/// <reference types="vitest" />
import { defineConfig } from "vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./src/manifest";
import { fileURLToPath } from "node:url";

export default defineConfig(({ mode }) => {
  const isTest = mode === "test";
  const alias = isTest
    ? [
        {
          find: "/@vite/env",
          replacement: fileURLToPath(
            new URL("./test/shims/vite-env.ts", import.meta.url),
          ),
        },
      ]
    : [];

  return {
    // Avoid CRX plugin during tests
    plugins: isTest ? [] : [crx({ manifest })],
    resolve: { alias },
    build: {
      sourcemap: true,
      minify: false,
    },
    test: {
      globals: true,
      environment: "happy-dom",
      setupFiles: ["./test/test-setup.ts"],
    },
  };
});
