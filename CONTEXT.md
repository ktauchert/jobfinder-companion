# CONTEXT.md – Domain vocabulary

Shared language for JobFinder. Code, docs, issues and conversations use these
terms exactly. When a new concept appears, add it there first, then use it in
code. This file is a glossary only — no folder paths, no queue names, no
framework choices (those live in `docs/ARCHITECTURE.md` and `docs/adr/`).

## Core concepts

| Term                | Meaning                                                                                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Profile**         | The user's search intent: must-have skills, exclude skills, optional filters (remote type, country, min salary) and a free-text summary. Single-user, but stored as a record. |
| **Must-have**       | A skill in the profile that should appear in a job. Drives _ranking_, does not filter.                                                                                        |
| **Exclude** (No-Go) | A skill in the profile that _hard-filters_ a job out of results. Deterministic.                                                                                               |
| **Source**          | An upstream provider of jobs (BA, Greenhouse, Lever, Adzuna, Apify). Identified by a `SourceKey`.                                                                             |
| **Tier**            | `free` (no credentials) or `paid` (needs env keys). A paid source without keys is _unconfigured_.                                                                             |
| **Adapter**         | A module that talks to one Source and yields NormalizedJobs. Implements the Source port; never leaks upstream payload shapes past its own module.                             |
| **Normalized job**  | A job mapped to the canonical shape (`NormalizedJob`) regardless of source. Identity is `(source, externalId)`.                                                               |
| **Enrichment**      | The post-fetch stages that add skills (extract) and an embedding (embed) to a stored job.                                                                                     |
| **Skill**           | A canonical, lower-case technology/competency name (`typescript`), with a display label and aliases.                                                                          |
| **Extraction**      | Using the extract model to pull skills out of a job description as structured JSON.                                                                                           |
| **Embedding**       | A fixed-dimension vector for a job or profile, used for similarity ranking.                                                                                                   |
| **Match**           | A job scored against the profile: `matchScore` (0–100) = weighted blend of vector `similarity` and `mustHaveCoverage`. Computed, not stored.                                  |
| **Hybrid search**   | Deterministic filters (excludes, remote type, country, salary, age) first, then ordering by vector similarity.                                                                |

## Pipeline

| Term                    | Meaning                                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Run** (Ingestion run) | One triggered ingestion across selected sources. Owns a status machine and stats. One click on "Run" = one run. |
| **Stage**               | `fetch` → `extract` → `embed`. Ordered steps of enrichment for a job within a run.                              |
| **Progress event**      | A live signal about run or source progress, delivered to the UI as it happens.                                  |
| **Status bar**          | The collapsible area in `Main` that renders progress events for the active run.                                 |

## Design language (how we structure code)

| Term         | Meaning                                                                                                                             |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Use case** | Application orchestration for one intention (`StartRun`, `ProcessFetch`, `SearchJobs`, …). Depends on ports only; no I/O libraries. |
| **Port**     | An interface at an I/O boundary (or where a fake is needed for a test). Exists only when that rule applies — not by default.        |

## UI

| Term           | Meaning                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Layout**     | Header / Main / Footer. Nothing else. No sidebar.                                                                        |
| **Tag bar**    | The typing-first input in `Main` for must-haves and excludes.                                                            |
| **Job list**   | The match-ordered stream of job cards in `Main`.                                                                         |
| **Job card**   | One match: title, company, location/remote, salary, match score, skill chips.                                            |
| **Skill chip** | A skill on a card, styled by `SkillMatchState`: `must_have` (check), `excluded` (cross), `neutral`.                      |
| **Shortcut**   | A keyboard binding listed in the Footer (`/` search, `r` refresh, `i` ingest, `j`/`k` navigate, `Enter` open, `h` hide). |
| **Hidden job** | A job the user dismissed; excluded from the list unless `includeHidden`.                                                 |

## Non-terms (avoid)

- "Dashboard", "sidebar", "navigation menu": the app has none.
- "Crawl"/"scrape" for API-based sources; say _fetch_. Reserve _scrape_ for HTML sources.
- "User" in the multi-user sense; there is one user. Say _the profile_ when you mean their preferences.
- "Worker", "fetch queue", "enrich queue" in domain talk: those are infrastructure (see ADR 0002 / ARCHITECTURE). Prefer _run_, _stage_, _use case_.
- "Service" when you mean _use case_ or _port_ — pick the precise term.
