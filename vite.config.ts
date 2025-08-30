/// <reference types="vitest" />
import { defineConfig } from "vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./src/manifest";

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    sourcemap: true,
    minify: false,
  },
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./test/test-setup.ts"],
  },
});
