import { node } from "@jobfinder/config/eslint/node";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...node,
  {
    ignores: ["dist/**", "vitest.config.ts", "vitest.integration.config.ts", "src/integration/**"],
  },
  {
    files: ["src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "../adapters/**",
                "**/adapters/**",
                "../http/**",
                "**/http/**",
                "../workers/**",
                "**/workers/**",
              ],
              message: "domain/ must stay pure: no adapters, http, or workers.",
            },
            {
              group: [
                "@jobfinder/database",
                "drizzle-orm",
                "drizzle-orm/*",
                "bullmq",
                "express",
                "express/*",
                "ioredis",
                "postgres",
                "pg",
                "pg/*",
              ],
              message: "domain/ must not import infrastructure packages.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/application/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "../adapters/**",
                "**/adapters/**",
                "../http/**",
                "**/http/**",
                "../workers/**",
                "**/workers/**",
              ],
              message: "application/ depends on ports only, not adapters/http/workers.",
            },
          ],
        },
      ],
    },
  },
];
