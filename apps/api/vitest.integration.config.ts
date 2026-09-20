import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["src/integration/setup-env.ts"],
    include: ["src/integration/**/*.test.ts"],
    exclude: [],
    testTimeout: 60_000,
    hookTimeout: 30_000,
    fileParallelism: false,
    typecheck: {
      tsconfig: "./tsconfig.integration.json",
    },
  },
});
