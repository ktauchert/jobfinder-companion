import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

/**
 * Base ESLint flat config shared by every workspace.
 * Consumers spread this into their own `eslint.config.js` and add
 * environment-specific configs (`./node`, `./react`).
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const base = tseslint.config(
  {
    ignores: ["**/dist/**", "**/build/**", "**/.output/**", "**/coverage/**", "**/node_modules/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      // `type X = { ... }` and `interface X { ... }` are both fine; aliases are
      // often clearer for small wrapper shapes and unions.
      "@typescript-eslint/consistent-type-definitions": "off",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    ...tseslint.configs.disableTypeChecked,
  },
  prettier,
);

export default base;
