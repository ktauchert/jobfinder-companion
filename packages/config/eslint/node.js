import globals from "globals";
import { base } from "./base.js";

/**
 * ESLint config for Node.js workspaces (apps/api, packages/database).
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const node = [
  ...base,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // Servers and workers legitimately log to stdout; structured logging is preferred,
      // but console is not an error here.
      "no-console": "off",
    },
  },
];

export default node;
