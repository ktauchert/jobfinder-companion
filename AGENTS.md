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
4. **Ingestion never runs in a request handler.** HTTP and workers are entry
   points that call the same application use cases. Anything that talks to an
   external job API or to Ollama goes through a port implemented by an adapter
   (BullMQ queue, Ollama client, source adapters). See ADR 0002.
5. **Schema has one owner.** Tables live in `packages/database` (Drizzle).
   `docker/init.sql` enables extensions only. Never `CREATE TABLE` outside a
   Drizzle migration. Repository _adapters_ live in `apps/api`, not in the
   database package.
6. **Source adapters map to `NormalizedJob`** (`packages/types`). Adapter code
   never leaks upstream payload shapes past its own module.
7. **Paid sources are gated by configuration, not code.** A source with missing
   env vars reports `configured: false`; the pipeline skips it and the UI greys
   it out. Never hard-fail because a key is missing.
8. **Shared types cross boundaries via `@jobfinder/types`.** Do not duplicate
   API contracts in `apps/web`.
9. **Always red-first.** New behaviour starts with a failing test. Domain and
   application code without a preceding red test fails `/code-review`.
   Characterization tests are only for refactoring untested code.

## Workspace layout

```
apps/api            Express 5 + workers; layered per ADR 0002 (domain / application / ports / adapters)
apps/web            React SPA (Vite, TanStack Router/Query, Tailwind, shadcn/ui) — no hexagonal layering
packages/types      Shared TS types (domain shapes + API DTOs, pure, no runtime deps)
packages/database   Drizzle schema, migrations, DB client only (no repository adapters)
packages/config     Shared tsconfig + ESLint flat configs
docker/             init.sql (extensions), Caddyfile
docs/               ARCHITECTURE, ROADMAP, ADRs, agent skill notes
```

Package names are `@jobfinder/<dir>`. Node >= 22, npm workspaces, Turborepo.

## Design & testing (`apps/api`)

Full rules: ADR 0002. Agents must follow these mechanically:

- **Layers:** `domain/` → `application/` → `ports/` ← `adapters/`; entry points
  are `http/` and `workers/`. Both call use cases; neither owns business rules.
- **Domain is pure.** No imports of Drizzle, BullMQ, Express, Ollama, Redis, or
  anything under `adapters/`, `http/`, `workers/`. Enforce with ESLint
  `no-restricted-imports`.
- **Application depends on ports only.** No adapter imports.
- **Port kill rule.** A port exists only if it crosses I/O **or** a fake is
  required for a domain/application test. One-implementation interfaces need
  justification in the PR.
- **Aggregates / VOs:** `IngestionRun`, `Job`, `Profile`, `Match`,
  `NormalizedJob`. Skill canonicalisation is a domain service.
- **Hybrid search:** SQL filters + vector distance in the repository adapter;
  `Match.score` in domain.
- **TDD:** red → green → refactor for every new behaviour. Unit tests for
  domain/application (in-memory fakes). Fixture/contract tests for adapters
  (no live upstream HTTP or Ollama in unit tests). Integration tests use Docker.
- **`apps/web`:** components + TanStack Query + typed client. No ports/adapters
  theatre on the client.

## Commands

```
npm install                 install all workspaces
npm run infra:up            postgres + redis + ollama (CPU)
npm run infra:up:gpu        same stack, Ollama with NVIDIA GPU (docker-compose.gpu.yml)
npm run dev                 all apps in watch mode (turbo)
npm run check               same as CI: format, lint, typecheck, unit tests, build, migrate, seed, integration tests
npm run check:quality       format + lint + typecheck + unit tests + build (no Docker)
npm run check:integration   migrate + seed + integration tests (needs Postgres + Redis)
npm run db:generate         drizzle-kit generate  (after schema change)
npm run db:migrate          apply migrations
npm run format              prettier --write .
```

Run `npm run check` before committing (start infra with `npm run infra:up` first).
CI runs the same steps via `check:quality` and `check:integration`.

## Debugging empty search

Before changing search SQL or UI filters, confirm data exists:

1. `GET /api/jobs` — check `total` (not just the first page).
2. Ingestion stats — jobs need `embedded_at` set before they appear in search.
3. Profile — `mustHaveSkills` filters on **`job_skills`**, not job title or
   description text. See `docs/SEARCH-AND-EMBEDDINGS.md` and ADR 0006.

Empty list with zero `total` is an **ingest/data** problem, not a ranking bug.

## Infrastructure adapters (`apps/api`)

- **BullMQ custom job ids:** no colons, or exactly three `:`-separated segments.
  Centralise in `apps/api/src/adapters/queue/job-ids.ts` (with tests); never
  inline ids in queue adapters.
- **Redis pub/sub (SSE):** duplicate via `createRedisSubscriber()` in
  `connection.ts` (`enableReadyCheck: false`).

## Coding conventions

- TypeScript strict everywhere; `noUncheckedIndexedAccess` is on. No `any`,
  no non-null assertions without a comment explaining why.
- ESM only (`"type": "module"`). Relative imports inside a package use `.js`
  extensions in `packages/*` and `apps/api`.
- Validation at the edge: Zod schemas in `apps/api/src/http/**`, typed with
  `satisfies` against `@jobfinder/types`.
- Errors: throw typed errors, map to `ApiError` in one Express error handler.
- Logging: structured (pino), never `console.log` in `apps/api` hot paths.
- Tests: Vitest. Red-first (hard rule 9). Unit-test adapters against recorded
  fixtures (no live HTTP in unit tests). Integration tests use Docker services.
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
- API list fields (`skillMatches`, profile skill arrays, skill search results):
  use `?? []` before `.length` or `.map` — cache and error paths can omit them.
- Refresh job list during ingest via SSE invalidation (`ingestion-events-context`),
  not open-ended `refetchInterval` on `useJobsSearch` (loads Postgres under ingest).

## Working with issues

- Issues and milestones are on GitHub (`gh issue ...`). Every non-trivial change
  references an issue.
- **Branch per milestone (or issue cluster), not on `main`.** When picking up a
  milestone or a set of related issues, create a branch from up-to-date `main`
  (e.g. `phase-1-ingestion`, `feat/issue-12-ba-adapter`) and open a PR when
  ready. Direct commits to `main` are for tiny fixes or when the human
  explicitly says so — Phase 0 scaffolding was an exception.
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

Matt Pocock's skills are installed under `.agents/skills/`. Use
`/grill-with-docs` before large features, `/to-tickets` to break plans into
GitHub issues, `/tdd` for implementation, and `/code-review` before committing.
See `docs/agent-skills.md` for which skills fit this project and how.

### Issue tracker

Issues live in GitHub Issues (`ktauchert/jobfinder-companion`), operated via
`gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default triage labels (`needs-triage`, `needs-info`,
`ready-for-agent`, `ready-for-human`, `wontfix`) are used unchanged. See
`docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root. See
`docs/agents/domain.md`.

### Lessons learned

Dated post-incident notes (symptoms vs causes, workflow mistakes). See
`docs/agents/lessons-learned.md`. Append after non-trivial debugging sessions;
link the GitHub issue or PR when possible.
