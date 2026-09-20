# 0001 – Foundational decisions

- Status: accepted
- Date: 2026-09-20

This ADR bundles the decisions taken when the repository was created. Later
ADRs supersede individual items.

## Context

JobFinder is a single-user, self-hosted tool. Priorities, in order: fast to
use (keyboard, millisecond search), cheap to run (local models, one box),
cheap to maintain (small stack, official generators, one schema owner). The
project is built largely with AI agents, so decisions must be explicit enough
for an agent to follow without re-deriving them.

## Decisions

### D1. Turborepo + npm workspaces, no pnpm/yarn

Native npm workspaces keep tooling to what ships with Node. Turborepo adds
task graph and caching. Package names are `@jobfinder/<dir>`.

### D2. Express 5 for the API (Hono considered)

The project brief specifies Express. Express 5 has native async error handling
and a huge ecosystem. Hono would give better type inference and a built-in
SSE helper; if the SSE relay or typed routing becomes painful, revisit in a
new ADR. The HTTP layer is kept thin (`src/http/**`) so a swap stays local.

### D3. Ingestion runs only in BullMQ workers

External APIs are rate-limited and Ollama calls take seconds. Request handlers
only enqueue and read. Workers publish progress to Redis pub/sub; the API
relays it over SSE. This decouples processes and makes the pipeline
restartable and observable.

### D4. Fetch queue split by tier; enrich queue shared

`ingest:fetch:free` and `ingest:fetch:paid` have independent concurrency and
limiters so a paid source's caution never throttles free sources.
Extraction and embedding are source-agnostic and bounded by Ollama, so they
share `ingest:enrich`.

### D5. Drizzle owns the schema; `init.sql` enables extensions only

The brief asked for base tables in `init.sql`. Having both `init.sql` and
Drizzle migrations create tables produces two sources of truth and breaks
`drizzle-kit` on a pre-populated database. `init.sql` therefore enables
`vector`, `pg_trgm`, `unaccent`, `pgcrypto` and nothing else. The table design
is documented in `ARCHITECTURE.md §7` and implemented in the first Drizzle
migration.

### D6. `nomic-embed-text` (768-d) and `qwen2.5:3b` via Ollama

Both run on CPU within reasonable time and are good enough for ranking a few
thousand jobs. The vector column is `vector(768)`; changing the model is a
migration plus full re-embed and needs its own ADR.

### D7. Excludes filter, must-haves rank

An exclude is a hard SQL `NOT EXISTS`. A must-have contributes to
`mustHaveCoverage`, blended with cosine similarity into `matchScore`
(0.6 / 0.4). Filtering on must-haves would hide jobs whose skill extraction
missed a term; ranking degrades gracefully instead.

### D8. Layout is Header / Main / Footer, keyboard-first

No sidebar, no routes-as-pages. TanStack Router manages URL search params for
state, not navigation between screens. Shortcuts come from one registry and
are always visible in the Footer.

### D9. Official generators over hand-written boilerplate

`apps/web` is bootstrapped with the TanStack Router + Vite CLI; shadcn/ui via
its CLI; Drizzle migrations via `drizzle-kit`. Agents adapt generated output,
they do not recreate it.

### D10. TypeScript 5.9 for now

TypeScript 6/7 (native compiler) exists, but parts of the toolchain
(drizzle-kit, Vite plugins, typescript-eslint) are not uniformly verified
against it. Pin `^5.9` and track the upgrade in the backlog.

### D11. Pure types in `@jobfinder/types`, validation in `apps/api`

The shared package has zero runtime dependencies so `apps/web` bundles stay
lean. Zod schemas live in the API and are typed with `satisfies` against the
shared contracts.

## Consequences

- One `docker compose up` gives a complete backend; no cloud dependencies.
- Adding a source is one adapter module plus a registry entry; nothing else
  changes.
- Changing the embedding model is deliberately expensive.
- Two-process deployment (api + worker) is possible without code changes
  because communication already goes through Redis.
- Agents have unambiguous rules for the two places they most often go wrong:
  UI structure and framework scaffolding.
