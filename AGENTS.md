# AGENTS.md

Rules for AI agents (and humans) working in this repository. Read this before
touching code. Keep it short; put detail in the linked docs.

## What this is

JobFinder: a self-hosted, single-user, keyboard-first job matching engine for
developers. A background pipeline ingests jobs, extracts skills and embeddings
with Ollama, and stores them in PostgreSQL + pgvector. Search is
deterministic filters + vector similarity, in milliseconds.

- Domain vocabulary: `CONTEXT.md` (use these terms in code, docs, and chat)
- Architecture and data model: `docs/ARCHITECTURE.md`
- Phases and scope: `docs/ROADMAP.md`
- Decisions and their reasons: `docs/adr/`

## Hard rules

1. **Never hand-write framework boilerplate that an official generator exists for.**
   `apps/web` is created with the official TanStack Router + Vite CLI, shadcn/ui
   components with `npx shadcn@latest add`, Drizzle migrations with
   `drizzle-kit generate`. If a canonical starter or CLI exists, use it, then
   adapt. Do not reproduce its output by hand.
2. **Layout is Header / Main / Footer. No sidebar. No nested dashboards.**
   Every interaction lives in `Main`: search & profile tag bar, ingestion
   status bar, job list. Navigation is by keyboard, not by menu. If a feature
   seems to need a sidebar or a second page, redesign it as a panel inside
   `Main` or a keyboard-driven overlay.
3. **Typing-first.** Every action must be reachable with the keyboard. Shortcuts
   are documented in the Footer. Mouse support is additive.
4. **Ingestion never runs in a request handler.** Anything that talks to an
   external job API or to Ollama goes through BullMQ (`packages`/`apps/api`
   workers). The API only enqueues and streams progress via SSE.
5. **Schema has one owner.** Tables live in `packages/database` (Drizzle).
   `docker/init.sql` enables extensions only. Never `CREATE TABLE` outside a
   Drizzle migration.
6. **Source adapters map to `NormalizedJob`** (`packages/types`). Adapter code
   never leaks upstream payload shapes past its own module.
7. **Paid sources are gated by configuration, not code.** A source with missing
   env vars reports `configured: false`; the pipeline skips it and the UI greys
   it out. Never hard-fail because a key is missing.
8. **Shared types cross boundaries via `@jobfinder/types`.** Do not duplicate
   API contracts in `apps/web`.

## Workspace layout

```
apps/api            Express 5 API + BullMQ workers + source adapters
apps/web            React SPA (Vite, TanStack Router/Query, Tailwind, shadcn/ui)
packages/types      Shared TS types (pure, no runtime deps)
packages/database   Drizzle schema, migrations, DB client, pgvector helpers
packages/config     Shared tsconfig + ESLint flat configs
docker/             init.sql (extensions), Caddyfile
docs/               ARCHITECTURE, ROADMAP, ADRs, agent skill notes
```

Package names are `@jobfinder/<dir>`. Node >= 22, npm workspaces, Turborepo.

## Commands

```
npm install                 install all workspaces
npm run infra:up            postgres + redis + ollama (+ model pull)
npm run dev                 all apps in watch mode (turbo)
npm run check               lint + typecheck + test across the repo
npm run db:generate         drizzle-kit generate  (after schema change)
npm run db:migrate          apply migrations
npm run format              prettier --write .
```

Run `npm run check` before committing. CI runs the same.

## Coding conventions

- TypeScript strict everywhere; `noUncheckedIndexedAccess` is on. No `any`,
  no non-null assertions without a comment explaining why.
- ESM only (`"type": "module"`). Relative imports inside a package use `.js`
  extensions in `packages/*` and `apps/api`.
- Validation at the edge: Zod schemas in `apps/api/src/http/**`, typed with
  `satisfies` against `@jobfinder/types`.
- Errors: throw typed errors, map to `ApiError` in one Express error handler.
- Logging: structured (pino), never `console.log` in `apps/api` hot paths.
- Tests: Vitest. Unit-test adapters against recorded fixtures (no live HTTP in
  tests). Integration tests use the Docker services.
- Naming follows `CONTEXT.md`. If you need a new term, add it there first.
- Comments explain _why_, not _what_. No narrating comments.

## UI conventions (`apps/web`)

- shadcn/ui components live in `src/components/ui/` and are generated, not
  hand-written. App components live in `src/components/`.
- Tailwind utility classes; no CSS modules, no styled-components.
- State from the server goes through TanStack Query; local UI state stays in
  components or a tiny store. No global state library unless an ADR says so.
- Shortcuts are registered in one place (`src/lib/shortcuts.ts`) and rendered
  in the Footer from that registry.
- Match score, skill chips (`must_have` / `excluded` / `neutral`) and the
  ingestion status bar are the core UI primitives; keep them consistent.

## Working with issues

- Issues and milestones are on GitHub (`gh issue ...`). Every non-trivial change
  references an issue.
- Labels: `area:*`, `type:*`, plus triage labels `needs-triage`, `needs-info`,
  `ready-for-agent`, `ready-for-human`, `wontfix`.
- Prefer small vertical slices (tracer bullets) over horizontal layers.
- Record decisions with lasting impact as ADRs in `docs/adr/` (see the README there).

## What agents must not do without asking

- Add a new runtime dependency to `apps/web` or `apps/api` beyond the documented stack.
- Change the embedding model or vector dimension (requires a re-embed migration).
- Introduce authentication or multi-user features (out of scope; single user).
- Add a sidebar, drawer navigation, or a second top-level route.

## Agent skills

If Matt Pocock's skills are installed, use `/grill-with-docs` before large
features, `/to-tickets` to break plans into GitHub issues, `/tdd` for
implementation, and `/code-review` before committing. See
`docs/agent-skills.md` for which skills fit this project and how.
