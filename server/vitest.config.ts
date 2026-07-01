import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // tsx handles TypeScript in the CJS server package
    pool: "forks",
    forks: { execArgv: ["--import", "tsx/esm"] },
  },
});
