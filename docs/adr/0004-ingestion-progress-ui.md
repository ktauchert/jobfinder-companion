# 0004 – Ingestion progress UI (run.progress, hybrid SSE + poll)

- Status: accepted
- Date: 2026-09-20

## Context

Phase 1 shipped fetch progress via `source.progress` SSE events. Extract and
embed only updated Postgres counters, so the status bar froze after fetch
completed while Ollama work continued for hours. Status polling (`GET
/api/ingest/status`) returned 304 when stats were unchanged between slow Ollama
calls, which looked like a bug.

Enrich progress is **run-wide** (all sources share one enrich queue), unlike
fetch which is naturally per-source.

## Decision

### D1. Add `run.progress` SSE events

Workers publish `run.progress` with a full `IngestionRunStats` snapshot every
25 extract or embed completions (same batch size as fetch progress). Keep
existing `source.progress` for per-source fetch detail.

### D2. Hybrid UI: SSE primary, status poll as backup

The status bar merges live SSE events with `GET /api/ingest/status` (TanStack
Query, 5s while active). Poll reconciles after SSE reconnect and page load.

### D3. One shared SSE client (module singleton)

The web app opens **one** `EventSource` via `ingestion-sse-client.ts` (reference
count + 2s disconnect grace). Do **not** open SSE inside hooks that multiple
components call — React Strict Mode and HMR will mount/unmount twice in dev,
aborting earlier streams. On transport error, reconnect with exponential
backoff (max 30s) and invalidate the status query once.

### D4. Re-run backfill for unfinished enrich

On fetch upsert, if content is unchanged but `embedded_at` is null, re-queue
enrich (`extract` or `embed` depending on `skills_extracted_at`). Avoids
stranded jobs after cancel mid-enrich.

### D5. PoC default: BA-only ingestion

Seed enables only `ba` by default. Greenhouse and Lever stay in the registry but
disabled until Phase 2 adapters exist.

## Consequences

- Status bar shows three pipeline rows: fetch, extract, embed.
- Slightly more Redis pub/sub traffic during long enrich runs (batched).
- Re-run after cancel completes enrich for stranded rows without duplicating jobs.
- Phase 3 can add collapsible bar and ETA without changing the event model.

## Lessons learned (SSE in dev)

Worth documenting — each piece is “well known”, but together they looked like a
pipeline bug during Phase 1 manual testing.

| Symptom                                                                              | Actual cause                                                                                                                      |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Firefox Network shows **2× Blocked** + **1× open** `/api/ingest/events` on page load | React Strict Mode mount → unmount → remount aborts the first streams; the surviving one is correct.                               |
| SSE request **Blocked** or **503**                                                   | Server `MAX_CONNECTIONS` exhausted by leaked dev connections, or browser aborted a replaced stream — not CORS or Vite “bundling”. |
| Status bar frozen after fetch; only `/api/ingest/status` **304** in Network          | Enrich stages had no SSE events yet; 304 just means counters unchanged between slow Ollama calls.                                 |
| Progress only via poll                                                               | By design as backup (D2); SSE is primary once connected.                                                                          |

**Checklist for future SSE features**

1. **One stream per browser tab** — singleton or top-level provider, never per-component `EventSource`.
2. **Strict Mode** — expect aborted requests in dev; use disconnect grace, do not treat Blocked as prod failure.
3. **API** — flush headers immediately (`: connected` comment), clean up on `close`/`error`, cap connections generously for dev.
4. **Vite proxy** — dedicated rule for `/api/ingest/events` with `no-cache` / `text/event-stream` (see `apps/web/vite.config.ts`).
5. **Verify** — one open `eventsource` row in Network; `curl -N` to API port if unsure whether the bug is proxy vs client.

Implementation: `apps/web/src/lib/ingestion-sse-client.ts`, `apps/api/src/http/sse.ts`.
