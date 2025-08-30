/// <reference types="vitest" />
import { defineConfig } from "vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./src/manifest";

export default defineConfig(({ mode }) => {
  const isTest = mode === "test";
  return {
    plugins: isTest ? [] : [crx({ manifest })],
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
