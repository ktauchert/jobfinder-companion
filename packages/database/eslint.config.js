import { node } from "@jobfinder/config/eslint/node";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...node,
  {
    ignores: ["dist/**", "drizzle/**", "drizzle.config.ts"],
  },
];
