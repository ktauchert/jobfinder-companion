# 0005 – Profile-driven ingest queries (multi-term fetch)

- Status: proposed
- Date: 2026-09-20

## Context

Phase 2 ships hybrid search driven by the **profile** (must-haves, excludes,
filters, embedding). Ingestion still uses a **hardcoded** upstream query in the
Header Run button (`softwareentwickler`, `Berlin`) — a PoC tracer bullet.

That split is intentional for Phase 2: prove fetch → enrich → search end-to-end
before wiring ingest to user intent. It is not the long-term model.

Upstream sources (BA Jobsuche) require search parameters at fetch time (`was`,
`wo`, …). The user may want several role “likes” in one session — e.g.
_Softwareentwickler_, _Fullstack_, _Product Developer_ — not a single fixed
title. Those terms belong in **ingest configuration**, not in hybrid search
filters: search can only rank jobs that were fetched and enriched.

`StartIngestionRequest` already accepts optional `query` and `location`; the UI
does not expose them yet. `FetchJobData.query` is passed verbatim to adapters.

## Decision

### D1. Keep hardcoded ingest query for Phase 2 PoC

Do not block Phase 2 exit on profile-driven ingest. The Header Run button
continues to pass fixed defaults until the follow-up issue in Phase 3 is
implemented.

### D2. Add **ingest queries** to the profile (Phase 3)

Extend `Profile` (or a closely related persisted shape) with:

- `ingestQueries: string[]` — free-text upstream terms (role likes), e.g.
  `["softwareentwickler", "fullstack", "product developer"]`
- Reuse existing `location` / `countryCodes` / profile fields where they map to
  upstream location hints (`wo`, radius) — exact field mapping per adapter.

On `POST /api/ingest/start`, when the client omits `query` / `location`, derive
defaults from the active profile’s `ingestQueries` and location filters instead
of env defaults or hardcoded Header strings.

### D3. One fetch job per (source × ingest query) per run

For each selected source and each non-empty term in `ingestQueries`, enqueue one
`fetch` job with that term as `FetchJobData.query`. Upsert dedupes by
`(source, externalId)` across all fetches in the run.

`INGEST_MAX_JOBS` applies to **enrichment** across the whole run (unchanged):
fetch may discover more listings than the cap; once the cap is reached, the
fetch worker stops enqueueing extract/embed for new rows.

### D4. Ingest queries ≠ search `q` ≠ must-have skills

| Concept             | When         | Purpose                                                  |
| ------------------- | ------------ | -------------------------------------------------------- |
| **Ingest query**    | Fetch stage  | Pull candidates from upstream APIs                       |
| **Must-have skill** | Search stage | Rank matches (does not filter)                           |
| **Exclude**         | Search stage | Hard-filter stored jobs                                  |
| **Search `q`**      | Search stage | Ad-hoc text blended into query embedding for one request |

Do not overload must-have skills as the BA `was` parameter by default — skills
(_typescript_, _react_) and role titles (_product developer_) are different
shapes. The profile may offer both lists later; Phase 3 starts with explicit
`ingestQueries`.

### D5. UI: keyboard-first ingest configuration in Main (Phase 3)

Replace the Header hardcode with profile-backed defaults. Optional: a compact
ingest panel or overlay (shortcut `i`) to edit terms and trigger Run without
leaving Main. Footer documents `i` when wired (see Phase 3 shortcut registry
issue).

## Consequences

**Easier:** One Run fetches a union of role likes; search/profile stays focused
on ranking and filtering stored jobs; API contract already accepts `query` /
`location` — mostly wiring and profile schema.

**Harder:** Run stats and progress UI must reflect multiple fetches per source
(per-term progress or aggregated totals). Duplicate upstream hits are cheap
(upsert no-op) but cost rate-limit budget.

**Remember:** PoC stays on hardcoded `softwareentwickler` until Phase 3. Jobs
never appear in search if they were never ingested — broadening ingest queries
is how new role types enter the pool.

## Supersedes / related

- Related: ADR 0003 (BA two-step fetch inside adapter), `ARCHITECTURE.md` §5
  (ingest flow), `CONTEXT.md` (Profile, Ingest query).
- GitHub: #50 (Phase 3 milestone).
