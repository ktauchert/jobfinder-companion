# Architecture

JobFinder is a self-hosted, single-user job matching engine. Instead of
querying job APIs live, a background pipeline fetches jobs, normalises them,
extracts skills and generates embeddings with a local LLM, and stores
everything in PostgreSQL. Search then runs entirely against the database:
deterministic SQL filters first, pgvector similarity for ordering.

Vocabulary: see [`CONTEXT.md`](../CONTEXT.md). Decisions: see [`adr/`](./adr/).

## 1. System overview

```
┌──────────────────────────────┐        ┌──────────────────────────────────────┐
│  apps/web  (React SPA)       │        │  apps/api  (Express 5)               │
│  Header / Main / Footer      │  REST  │  /api/*  routes, Zod validation      │
│  TanStack Router + Query     │◄──────►│  SSE relay  /api/ingest/events       │
│  Tailwind + shadcn/ui        │  SSE   │  BullMQ producers                    │
└──────────────────────────────┘        └───────────┬──────────────────────────┘
                                                    │ enqueue            ▲ pub/sub
                                                    ▼                    │
                          ┌──────────────────── Redis 7 ─────────────────┴──────┐
                          │  ingest:fetch:free   ingest:fetch:paid   ingest:enrich │
                          │  rate limiter state  ingestion:events channel          │
                          └──────────┬─────────────────────────┬─────────────────┘
                                     ▼                         ▼
                          ┌──────────────────────────────────────────────────────┐
                          │  BullMQ workers (apps/api/src/workers)               │
                          │  fetch ──► extract (Ollama qwen2.5:3b)              │
                          │        ──► embed   (Ollama nomic-embed-text)        │
                          └──────────┬─────────────────────────┬─────────────────┘
                                     ▼                         ▼
                   ┌──────────────────────────┐    ┌──────────────────────────┐
                   │ PostgreSQL 16 + pgvector │    │ Ollama (local)           │
                   │ jobs, skills, embeddings │    │ nomic-embed-text 768-d   │
                   │ profiles, ingestion_runs │    │ qwen2.5:3b               │
                   └──────────────────────────┘    └──────────────────────────┘
```

Everything runs on one machine via Docker Compose (Postgres, Redis, Ollama,
optionally Caddy). The apps run on the host in development and are
containerised in Phase 4.

## 2. Monorepo

Turborepo with native npm workspaces (`apps/*`, `packages/*`).

| Workspace           | Package               | Responsibility                                                                  |
| ------------------- | --------------------- | ------------------------------------------------------------------------------- |
| `apps/web`          | `@jobfinder/web`      | SPA. Created with the official TanStack Router + Vite CLI.                      |
| `apps/api`          | `@jobfinder/api`      | HTTP API, BullMQ producers and workers, source adapters, Ollama client.         |
| `packages/types`    | `@jobfinder/types`    | Pure shared types: `NormalizedJob`, `Profile`, `IngestionEvent`, API contracts. |
| `packages/database` | `@jobfinder/database` | Drizzle schema, migrations, DB client, pgvector query helpers.                  |
| `packages/config`   | `@jobfinder/config`   | Shared `tsconfig.*.json` and ESLint flat configs.                               |

Dependency direction: `web -> types`, `api -> types + database`,
`database -> types`. Nothing depends on `web` or `api`.

Turbo tasks: `build`, `dev` (persistent), `lint`, `typecheck`, `test`,
`generate`/`migrate` (database, uncached). `^build` ordering ensures
`packages/*` are built before apps consume them.

Development: `packages/*` emit `dist/` and are consumed via their `exports`.
In `dev`, `tsc --watch` keeps `dist/` fresh; Vite and `tsx` pick changes up.

## 3. Frontend (`apps/web`)

Strict three-region layout: **Header**, **Main**, **Footer**. No sidebar, no
second-level navigation. TanStack Router is used for URL state (search params
for the query, cursor, selected job), not for pages.

```
Header   [ JobFinder ]                          [ Ingestion: Idle | Run ]
Main     1. Tag bar       Skills: [TypeScript] [React] | Exclude: [Java]
         2. Status bar    Progress: BA (120/500) · Extracting skills…  [Stop]
         3. Job list      cards ordered by matchScore
Footer   [/] Search  [r] Refresh  [i] Ingest  [j/k] Move  [Enter] Open  [h] Hide
```

- **Server state**: TanStack Query hooks per endpoint, typed with `@jobfinder/types`.
- **Live progress**: `EventSource` on `/api/ingest/events`; events are reduced
  into the status bar and invalidate the jobs query on `run.completed`.
- **Shortcuts**: a single registry (`src/lib/shortcuts.ts`) drives both the key
  handlers and the Footer rendering. No shortcut exists that is not in the Footer.
- **Components**: shadcn/ui primitives (generated) in `components/ui/`; app
  components (`TagBar`, `StatusBar`, `JobCard`, `SkillChip`, `MatchScore`) in
  `components/`.

## 4. Backend API (`apps/api`)

Express 5 with a small, explicit structure:

```
src/
  index.ts              boot: env, db, redis, queues, http, workers (dev)
  env.ts                Zod-validated process.env
  http/
    app.ts              express app, middleware, error handler
    routes/             health, sources, ingest, profile, jobs
    sse.ts              SSE relay: Redis subscribe -> res.write
  queues/
    names.ts            QUEUE_NAMES from @jobfinder/types
    producers.ts        startRun(), enqueueEnrich()
    workers/
      fetch.worker.ts   runs a source adapter, upserts jobs, enqueues enrich
      enrich.worker.ts  extract | embed stage for one job
    events.ts           publish(IngestionEvent) -> Redis channel
  sources/
    registry.ts         SourceDefinition[] + configured() check from env
    ba/ greenhouse/ lever/ adzuna/ apify/
      adapter.ts        fetch(query) -> AsyncIterable<NormalizedJob>
      mapper.ts         upstream payload -> NormalizedJob
      fixtures/         recorded responses for tests
  ai/
    ollama.ts           thin client (embed, chat with JSON format)
    extract-skills.ts   prompt + parse + canonicalise skills
    embed.ts            text -> vector(768)
  search/
    query.ts            hybrid search SQL builder
    score.ts            matchScore = f(similarity, mustHaveCoverage)
```

### REST endpoints

| Method      | Path                 | Purpose                                              |
| ----------- | -------------------- | ---------------------------------------------------- |
| GET         | `/api/health`        | DB / Redis / Ollama reachability                     |
| GET         | `/api/sources`       | Sources with tier, `configured`, `enabled`, last run |
| PATCH       | `/api/sources/:key`  | Toggle `enabled`                                     |
| POST        | `/api/ingest/start`  | Create a run, enqueue one `fetch` job per source     |
| POST        | `/api/ingest/stop`   | Cancel the active run (drain queues, mark cancelled) |
| GET         | `/api/ingest/status` | Active + recent runs                                 |
| GET         | `/api/ingest/events` | SSE stream of `IngestionEvent`                       |
| GET         | `/api/profile`       | The profile                                          |
| PUT         | `/api/profile`       | Update profile; re-embeds asynchronously             |
| GET         | `/api/jobs`          | Hybrid search, cursor-paginated `JobMatch[]`         |
| GET         | `/api/jobs/:id`      | One `JobMatch`                                       |
| POST/DELETE | `/api/jobs/:id/hide` | Hide / unhide                                        |

Contracts live in `packages/types/src/api.ts`.

## 5. Ingestion pipeline (BullMQ + Redis)

Ingestion is slow (rate limits, LLM calls) and must never block a request.
Everything external runs in BullMQ workers.

### Queues

| Queue               | Job data        | Concurrency                 | Rate limit                        |
| ------------------- | --------------- | --------------------------- | --------------------------------- |
| `ingest:fetch:free` | `FetchJobData`  | 2                           | per-source limiter inside adapter |
| `ingest:fetch:paid` | `FetchJobData`  | 1                           | conservative; keys cost money     |
| `ingest:enrich`     | `EnrichJobData` | 2 (= `OLLAMA_NUM_PARALLEL`) | none; bounded by Ollama           |

Fetch is split by tier so a paid source's limiter never starves free sources
and vice versa.

### Flow of one run

1. `POST /api/ingest/start` inserts an `ingestion_runs` row and enqueues one
   `fetch` job per selected source that is `enabled && configured`.
   Unconfigured paid sources are skipped and reported in `run.started`.
2. **Fetch worker** streams `NormalizedJob`s from the adapter, upserts them by
   `(source, external_id)` and, for every inserted or materially changed row,
   enqueues `extract`. Publishes `source.progress` every N jobs.
3. **Enrich worker – extract**: sends `descriptionText` to `qwen2.5:3b` with a
   JSON-schema prompt, canonicalises skill names against `skills` (trigram
   match on aliases), writes `job_skills`, then enqueues `embed`.
4. **Enrich worker – embed**: embeds `title + company + skills + descriptionText`
   with `nomic-embed-text` (`search_document:` prefix), writes `job_embeddings`.
5. When all children of a run are settled, the run is marked `completed`
   (or `failed`) and `run.completed` is published. The UI invalidates the jobs
   query.

Idempotency: fetch upserts; extract/embed are keyed by `jobId + stage` with
BullMQ `jobId` so retries do not duplicate work. Failed jobs retry 3x with
exponential backoff, then land in the failed set for inspection.

Cancellation: `stop` sets the run to `cancelling`, removes waiting jobs for
that `runId`, and lets active jobs finish their current item.

### Progress events (SSE)

Workers publish `IngestionEvent`s to the Redis channel `ingestion:events`. The
API subscribes once per process and fans out to connected `EventSource`
clients. This keeps workers and API decoupled and works when workers run in a
separate process. A `heartbeat` event every 15s keeps proxies from closing the
stream (Caddy is configured with `flush_interval -1`).

### Source tiers

| Tier | Sources                               | Gate                            |
| ---- | ------------------------------------- | ------------------------------- |
| free | BA (Bundesagentur), Greenhouse, Lever | always `configured`             |
| paid | Adzuna, Apify (and future scrapers)   | `requiredEnv` all set in `.env` |

The registry computes `configured` at boot from `process.env`. The UI greys
out unconfigured sources with a tooltip naming the missing variables.

Adapters implement one interface:

```ts
interface SourceAdapter {
  definition: SourceDefinition;
  fetch(input: FetchJobData, ctx: FetchContext): AsyncIterable<NormalizedJob>;
}
```

`FetchContext` provides a rate limiter, an abort signal (for cancellation) and
a `progress(done, total, message)` callback. Adapters never touch the database.

## 6. AI layer (Ollama)

| Task             | Model              | Notes                                                                                                          |
| ---------------- | ------------------ | -------------------------------------------------------------------------------------------------------------- |
| Skill extraction | `qwen2.5:3b`       | `format: json`, low temperature, fixed schema `{ skills: [{name, confidence}] }`. Truncate input to ~6k chars. |
| Embeddings       | `nomic-embed-text` | 768 dims. Prefix `search_document:` for jobs, `search_query:` for the profile.                                 |

Model names and base URL come from env. Changing the embed model or dimension
requires a migration that drops and re-creates the vector column and a full
re-embed; this is a deliberate, ADR-worthy change.

## 7. Data model (owned by `packages/database`)

`docker/init.sql` only enables extensions (`vector`, `pg_trgm`, `unaccent`,
`pgcrypto`). The tables below are implemented as Drizzle schema + migrations.

```
sources          key PK, tier, enabled bool, created_at
jobs             id uuid PK, source FK, external_id, title, company, location,
                 country_code, remote_type, employment_type,
                 salary_min, salary_max, salary_currency, salary_period,
                 description_raw, description_text, url, posted_at,
                 content_hash, skills_extracted_at, embedded_at,
                 hidden_at, fetched_at, updated_at
                 UNIQUE (source, external_id)
skills           id uuid PK, name UNIQUE (canonical), label, aliases text[]
                 GIN index on aliases (trgm) for fuzzy canonicalisation
job_skills       job_id FK, skill_id FK, confidence real, PK (job_id, skill_id)
job_embeddings   job_id PK FK, model text, embedding vector(768), created_at
                 HNSW index (vector_cosine_ops)
profiles         id uuid PK, name, must_have_skills text[], exclude_skills text[],
                 summary, remote_types text[], country_codes text[], min_salary,
                 embedding vector(768), embedded_at, created_at, updated_at
ingestion_runs   id uuid PK, status, sources text[], started_at, finished_at,
                 stats jsonb, error
```

`content_hash` (sha256 of title+company+descriptionText) lets the fetch worker
skip re-enrichment when a source re-serves an unchanged job.

## 8. Hybrid search

Deterministic filters run in SQL first; only the survivors are ordered by
vector distance. Excludes are a hard filter; must-haves shape the score.

```sql
WITH p AS (SELECT * FROM profiles WHERE id = $profileId)
SELECT
  j.*,
  1 - (e.embedding <=> p.embedding)                        AS similarity,
  coalesce(mh.hits, 0)::float / greatest(cardinality(p.must_have_skills), 1)
                                                          AS must_have_coverage
FROM jobs j
JOIN job_embeddings e ON e.job_id = j.id
CROSS JOIN p
LEFT JOIN LATERAL (
  SELECT count(*) AS hits
  FROM job_skills js JOIN skills s ON s.id = js.skill_id
  WHERE js.job_id = j.id AND s.name = ANY (p.must_have_skills)
) mh ON true
WHERE j.hidden_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM job_skills js JOIN skills s ON s.id = js.skill_id
    WHERE js.job_id = j.id AND s.name = ANY (p.exclude_skills)
  )
  AND (cardinality(p.remote_types) = 0 OR j.remote_type = ANY (p.remote_types))
  AND (cardinality(p.country_codes) = 0 OR j.country_code = ANY (p.country_codes))
  AND (p.min_salary IS NULL OR j.salary_max IS NULL OR j.salary_max >= p.min_salary)
  AND j.fetched_at > now() - ($maxAgeDays || ' days')::interval
ORDER BY e.embedding <=> p.embedding
LIMIT $limit OFFSET $offset;
```

`matchScore` is computed in `search/score.ts`:

```
matchScore = round(100 * (0.6 * similarity + 0.4 * mustHaveCoverage))
```

Weights are constants for now; making them profile-tunable is a Phase 3 item.
The final list is re-sorted by `matchScore` in the API after fetching the
top-K by distance (K = 3 × page size) so the HNSW index still does the heavy
lifting.

Optional `q` (ad-hoc query text) is embedded on the fly with `search_query:`
and averaged with the profile embedding for that request only.

## 9. Configuration

All configuration is environment variables (`.env`, validated in
`apps/api/src/env.ts`). See `.env.example` for the full list. The web app
only sees `VITE_`-prefixed variables.

## 10. Deployment (Phase 4)

`docker compose --profile proxy` adds Caddy with automatic TLS. Phase 4 adds
Dockerfiles for `api` and `web`, a `docker-compose.prod.yml` override that
points Caddy at the containers, a separate `worker` process, and repeatable
BullMQ jobs for scheduled ingestion.

## 11. Non-goals

- Multi-user, auth, roles.
- Live querying of job APIs at search time.
- A generic ATS/CRM; JobFinder finds and ranks, it does not track applications
  (a "hide" flag is as far as it goes for now).
