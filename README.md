# JobFinder

Self-hosted, keyboard-first job matching engine for developers.

A background pipeline fetches jobs from free and paid sources, extracts skills
and generates embeddings with a local LLM (Ollama), and stores everything in
PostgreSQL + pgvector. You type your must-have and no-go skills once; the
list re-ranks in milliseconds.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ HEADER: [ JobFinder ]                        [Ingestion: Idle / Run]    │
├─────────────────────────────────────────────────────────────────────────┤
│ MAIN:                                                                   │
│  > Skills: [TypeScript] [React] [Node.js] | Exclude: [Java] [C#]        │
│  [ Progress: Processing BA API (120/500 Jobs) ] [Stop]                  │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Senior Fullstack Dev · Company XYZ                    Match: 96%  │  │
│  │ Remote (DE) · 80k - 95k EUR                                       │  │
│  │ [TS ✓] [React ✓] [Node ✓] [Java ✗ Excluded]                       │  │
│  └───────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│ FOOTER: [/] Search  [r] Refresh  [i] Ingest  [j/k] Move  [h] Hide       │
└─────────────────────────────────────────────────────────────────────────┘
```

No sidebar. No dashboard. Header, Main, Footer.

## Stack

| Layer         | Tech                                                                     |
| ------------- | ------------------------------------------------------------------------ |
| Monorepo      | Turborepo, npm workspaces (`apps/*`, `packages/*`)                       |
| Frontend      | React, Vite, TanStack Router, TanStack Query, Tailwind CSS, shadcn/ui    |
| API           | Node.js 22+, Express 5, BullMQ, Server-Sent Events                       |
| Database      | PostgreSQL 16 + pgvector, Drizzle ORM                                    |
| Queue / cache | Redis 7                                                                  |
| AI            | Ollama: `nomic-embed-text` (embeddings), `qwen2.5:3b` (skill extraction) |
| Infra         | Docker Compose, Caddy (optional reverse proxy)                           |

## Prerequisites

- Node.js >= 22 (`.nvmrc` says 24) and npm >= 10
- Docker with Compose v2
- ~6 GB free disk for the Ollama models; a GPU is optional

## Quick start

```bash
git clone git@github.com:ktauchert/jobfinder-companion.git
cd jobfinder-companion
cp .env.example .env          # adjust if ports collide (e.g. POSTGRES_PORT)

npm install                   # all workspaces
npm run infra:up              # postgres + redis + ollama (CPU), pulls models on first run
npm run db:migrate            # apply Drizzle migrations
npm run dev                   # api on :3000, web on :5173
```

**NVIDIA GPU (optional):** use `npm run infra:up:gpu` instead of `infra:up`.
That merges `docker-compose.gpu.yml` into the base stack (same containers and
volumes). Verify with `docker exec jobfinder-ollama nvidia-smi`. Switching back
to CPU: `npm run infra:down` then `npm run infra:up`.

Open http://localhost:5173, type your skills, press `i` to start the first
ingestion.

The first `infra:up` downloads the Ollama models (~2.5 GB); watch progress with
`npm run infra:logs` (or `infra:logs:gpu`).

## Job sources

| Source                        | Tier | Needs                                |
| ----------------------------- | ---- | ------------------------------------ |
| Bundesagentur für Arbeit (BA) | free | –                                    |
| Greenhouse boards             | free | company slugs (configured in the UI) |
| Lever postings                | free | company slugs (configured in the UI) |
| Adzuna                        | paid | `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`    |
| Apify actors                  | paid | `APIFY_TOKEN`                        |

Paid sources without keys are shown greyed out and skipped. Nothing breaks.

## Scripts

| Command                   | What it does                                 |
| ------------------------- | -------------------------------------------- |
| `npm run dev`             | All apps in watch mode                       |
| `npm run build`           | Build all workspaces                         |
| `npm run check`           | Lint + typecheck + test                      |
| `npm run format`          | Prettier                                     |
| `npm run infra:up`        | Start Postgres, Redis, Ollama (CPU)          |
| `npm run infra:up:gpu`    | Same, Ollama with NVIDIA GPU                 |
| `npm run infra:down`      | Stop them (data kept)                        |
| `npm run infra:down:gpu`  | Stop GPU stack (same containers/volumes)     |
| `npm run infra:logs`      | Follow infra logs                            |
| `npm run infra:logs:gpu`  | Follow infra logs (GPU compose files)        |
| `npm run infra:reset`     | Stop and delete all volumes                  |
| `npm run infra:reset:gpu` | Reset volumes (GPU compose files)            |
| `npm run db:generate`     | Generate a Drizzle migration from the schema |
| `npm run db:migrate`      | Apply migrations                             |
| `npm run db:seed`         | Seed canonical developer skills              |
| `npm run db:studio`       | Drizzle Studio                               |

Reverse proxy (optional): `docker compose --profile proxy up -d` serves
everything on `https://localhost` via Caddy.

## Repository layout

```
apps/api            Express API, BullMQ workers, source adapters
apps/web            React SPA
packages/types      Shared TypeScript types
packages/database   Drizzle schema, migrations, client
packages/config     Shared tsconfig / ESLint
docker/             init.sql, Caddyfile
docs/               ARCHITECTURE.md, ROADMAP.md, adr/, agent-skills.md
AGENTS.md           Rules for AI agents working here
CONTEXT.md          Domain vocabulary
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) – monorepo, queue pipeline, data model, hybrid search
- [Roadmap](docs/ROADMAP.md) – phases and exit criteria
- [Decisions](docs/adr/) – ADRs
- [AGENTS.md](AGENTS.md) – rules for AI-assisted development
- [Agent skills](docs/agent-skills.md) – which Matt Pocock skills to use and when

## Status

Phase 0 (Foundation). See the [milestones](https://github.com/ktauchert/jobfinder-companion/milestones).
