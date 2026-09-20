import { react } from "@jobfinder/config/eslint/react";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...react,
  {
    ignores: ["dist/**", "src/routeTree.gen.ts"],
  },
  {
    // Generated shadcn primitives export variants alongside components.
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    // TanStack file routes export Route + local page components.
    files: ["src/routes/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
];
