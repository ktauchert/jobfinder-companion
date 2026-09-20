# @jobfinder/config

Shared tooling configuration. No runtime code.

## TypeScript

| File                    | Use for                                          |
| ----------------------- | ------------------------------------------------ |
| `tsconfig.base.json`    | Strict defaults; everything extends this         |
| `tsconfig.library.json` | `packages/*` that emit `dist/` (types, database) |
| `tsconfig.node.json`    | `apps/api` (NodeNext module resolution)          |
| `tsconfig.react.json`   | `apps/web` (DOM libs, `react-jsx`, no emit)      |

```json
{ "extends": "@jobfinder/config/tsconfig.library.json", "include": ["src"] }
```

## ESLint (flat config)

```js
// eslint.config.js
import { node } from "@jobfinder/config/eslint/node";
export default node;
```

Variants: `eslint/base`, `eslint/node`, `eslint/react`. All are type-aware
(`projectService: true`), so each workspace needs a `tsconfig.json` that
includes the linted files.

## Prettier

Configured once at the repo root (`.prettierrc`). Do not add per-package
Prettier configs.
