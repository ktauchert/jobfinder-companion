# Roadmap

Phases map 1:1 to GitHub milestones. Each phase ends with something that runs
end-to-end, even if thin (tracer bullets over layers). Issues in each
milestone are the source of truth for scope; this document explains intent.

| Phase | Milestone                           | Outcome                                                                                  |
| ----- | ----------------------------------- | ---------------------------------------------------------------------------------------- |
| 0     | Foundation                          | Monorepo, docs, infra, `apps/*` and `packages/database` scaffolded, CI green             |
| 1     | Core Ingestion & Queue              | Click "Run" → BA jobs land in Postgres with skills and embeddings; progress visible live |
| 2     | Deterministic + Vector Search       | Profile tag bar → ranked job list with excludes filtered and match score                 |
| 3     | UI Fine-tuning & Keyboard Shortcuts | Everything reachable by keyboard; polished cards, status bar, footer                     |
| 4     | Self-Hosting & Operations           | Containerised apps, Caddy, scheduled ingestion, backups                                  |

## Phase 0 – Foundation

Done in the initial commit: workspace configs, `@jobfinder/types`,
`@jobfinder/config`, Docker Compose (Postgres+pgvector, Redis, Ollama, Caddy),
`init.sql`, docs, AGENTS.md, CONTEXT.md, ADR 0001.

Remaining (Step 2):

- `apps/web` via the official TanStack Router + Vite CLI, Tailwind, shadcn/ui
  init, Header/Main/Footer shell.
- `apps/api` Express 5 skeleton with `/api/health`, Zod env, pino logging.
- `packages/database` with Drizzle schema for all tables in
  `ARCHITECTURE.md §7`, first migration, `pgvector` column helper, DB client.
- GitHub Actions CI: `npm ci`, `npm run check`, `npm run build`.

Exit criteria: `npm run infra:up && npm run dev` starts web + api;
`GET /api/health` reports all three services reachable; CI green.

## Phase 1 – Core Ingestion & Queue

Goal: one full run for one free source, observable from the UI.

- Source registry with tiers and `configured` gating from env.
- BA (Bundesagentur für Arbeit) adapter → `NormalizedJob`, with recorded
  fixtures and tests.
- BullMQ queues (`ingest:fetch:free`, `ingest:fetch:paid`, `ingest:enrich`),
  producers and workers, retries and backoff.
- Fetch worker: upsert by `(source, external_id)`, `content_hash` skip,
  enqueue enrich.
- Ollama client; skill extraction with JSON output and canonicalisation into
  `skills` / `job_skills`.
- Embedding stage writing `job_embeddings`.
- `ingestion_runs` lifecycle: start, progress, complete, fail, cancel.
- Redis pub/sub → SSE relay (`/api/ingest/events`) with heartbeat.
- REST: `/api/sources`, `/api/ingest/start|stop|status`.
- UI: Header "Run" button with state, minimal status bar consuming SSE.

Exit criteria: pressing Run ingests ≥ 200 BA jobs; every job has skills and an
embedding; the status bar shows live progress; a failed Ollama call retries
and surfaces in `run.failed` without crashing the API.

## Phase 2 – Deterministic + Vector Search

Goal: the profile drives a ranked list.

- Profile model + `GET/PUT /api/profile`; profile embedding refreshed on save.
- Hybrid search query (`ARCHITECTURE.md §8`) as a Drizzle/SQL helper.
- `matchScore` scoring, `SkillMatch` breakdown per job.
- `GET /api/jobs` cursor pagination, `GET /api/jobs/:id`, hide/unhide.
- UI: Tag bar (must-haves / excludes) with keyboard entry, job list with
  cards, match score and skill chips; URL state via TanStack Router search params.
- Additional free sources: Greenhouse and Lever (company-slug based).
- First paid source: Adzuna, gated by `ADZUNA_APP_ID` / `ADZUNA_APP_KEY`;
  greyed out in the UI when unconfigured.
- Skill canonicalisation improvements (alias table seed, trigram matching).

Exit criteria: changing an exclude removes matching jobs instantly; adding a
must-have reorders the list; p95 search latency < 100 ms on 10k jobs.

## Phase 3 – UI Fine-tuning & Keyboard Shortcuts

Goal: the app is faster to use than a job board.

- Shortcut registry + Footer rendering: `/` search, `r` refresh, `i` ingest,
  `j`/`k` navigate, `Enter` open, `h` hide, `Esc` close, `?` help overlay.
- Collapsible status bar with per-source progress and Stop.
- Job detail as an inline expandable panel in `Main` (no route change, no
  sidebar).
- Empty, loading, error and "unconfigured source" states.
- Tunable score weights and `maxAgeDays` in the profile.
- Dark mode, focus rings, reduced-motion; accessibility pass.
- Performance: virtualised list, query prefetching, optimistic hide.

Exit criteria: a full session (edit profile, run ingestion, review 50 jobs,
hide 10) is possible without touching the mouse.

## Phase 4 – Self-Hosting & Operations

Goal: run it on a home server and forget about it.

- Dockerfiles for `api` and `web`; `docker-compose.prod.yml` with Caddy
  pointing at containers; separate `worker` process.
- Repeatable BullMQ job for scheduled ingestion (cron from env).
- Backup/restore script for Postgres; volume documentation.
- Apify adapter (paid) and an HTML-scrape adapter template.
- Health dashboard data in `/api/health` (queue depth, last run, model status).
- Optional GPU passthrough docs for Ollama.

## Backlog / Ideas (not scheduled)

- Multiple profiles and quick switching.
- Salary normalisation across currencies/periods.
- Duplicate detection across sources (same job on BA and Adzuna).
- Export (CSV/JSON) and a read-only share view.
- Evaluate TypeScript 6/7 (native compiler) once the toolchain supports it.
