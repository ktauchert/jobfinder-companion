# 0003 – Ingestion pipeline design (run completion, cancel, queue layout, BA fetch)

- Status: accepted
- Date: 2026-09-20

## Context

Phase 1 issues #7 and #8 had open design questions after BA API research (#5).
We need decisions on run lifecycle, cancellation, module layout, and how the BA
two-step API (v6 list + v4 detail) fits the `SourceAdapter` port before
implementing BullMQ and the BA adapter.

## Decision

### D1. Run completion via Postgres counters

Track pending work on `ingestion_runs` (per-source fetch jobs + enrich jobs).
Workers decrement counters; when zero, mark the run `completed` or `failed`.
Do **not** use BullMQ `FlowProducer` parent jobs — cancel/stop and cross-tier
queues (`fetch:free`, `fetch:paid`, `enrich`) are simpler without flow trees.

### D2. Cancel: scan waiting jobs + active no-op check

On `POST /api/ingest/stop`: set run to `cancelling`, remove **waiting** BullMQ
jobs whose payload contains the `runId` (scan all three queues), and let active
workers check run status before each item and exit early. No per-run queue
groups.

### D3. BullMQ lives behind the `JobQueue` port

Connection, queue instances, and BullMQ adapter implement `ports/job-queue.ts`
under `adapters/queue/`. Worker bootstrap stays in `workers/`. HTTP and workers
both call application use cases; neither owns queue wiring directly.

### D4. BA two-step fetch stays inside the adapter

The BA adapter orchestrates `GET /pc/v6/jobs` pagination and
`GET /pc/v4/jobdetails/{base64(referenznummer)}` per item internally, yielding
complete `NormalizedJob`s from `fetch()`. The fetch worker and use cases stay
source-agnostic.

### D5. BA rate limit: 1 req/s token bucket

Per-source Redis token bucket in `FetchContext.limiter`, default **1 request
per second** for BA. Combined with fetch-worker concurrency, effective throughput
is ~0.5 jobs/s (list + detail per job).

## Consequences

- Run lifecycle logic (#13) must maintain accurate pending counters.
- Stop is O(n) over waiting jobs; acceptable at Phase 1 volumes.
- BA adapter module owns v6/v4 schema mapping; fixtures must cover both shapes.
- Conservative BA cadence keeps us inside BA infrastructure norms; bulk runs
  (≥200 jobs) take several minutes, which matches Phase 1 exit criteria.
