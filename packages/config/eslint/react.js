import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import { base } from "./base.js";

/**
 * ESLint config for React + Vite workspaces (apps/web).
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const react = [
  ...base,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  {
    // TanStack Router generates this file; never lint it.
    ignores: ["**/routeTree.gen.ts"],
  },
];

export default react;
