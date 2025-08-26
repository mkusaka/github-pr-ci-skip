import { defineManifest } from "@crxjs/vite-plugin";
import packageJson from "../package.json";

export default defineManifest({
  name: "github-pr-ci-skip",
  version: packageJson.version,
  description: "Adds ci skip to PR title as default.",
  manifest_version: 3,
  content_scripts: [
    {
      matches: ["https://github.com/*"],
      run_at: "document_start",
      js: ["src/content.ts"],
    },
  ],
});
