# CONTEXT.md – Domain vocabulary

Shared language for JobFinder. Code, docs, issues and conversations use these
terms exactly. When a new concept appears, add it here before naming it in code.

## Core concepts

| Term                | Meaning                                                                                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Profile**         | The user's search intent: must-have skills, exclude skills, optional filters (remote type, country, min salary) and a free-text summary. Single-user, but stored as a record. |
| **Must-have**       | A skill in the profile that should appear in a job. Drives _ranking_, does not filter.                                                                                        |
| **Exclude** (No-Go) | A skill in the profile that _hard-filters_ a job out of results. Deterministic.                                                                                               |
| **Source**          | An upstream provider of jobs (BA, Greenhouse, Lever, Adzuna, Apify). Identified by a `SourceKey`.                                                                             |
| **Tier**            | `free` (no credentials) or `paid` (needs env keys). A paid source without keys is _unconfigured_.                                                                             |
| **Adapter**         | Code in `apps/api` that talks to one source and returns `NormalizedJob`s. One module per source.                                                                              |
| **Normalized job**  | A job mapped to the canonical shape (`NormalizedJob`) regardless of source. Identity is `(source, externalId)`.                                                               |
| **Enrichment**      | The post-fetch stages that add skills (extract) and an embedding (embed) to a stored job.                                                                                     |
| **Skill**           | A canonical, lower-case technology/competency name (`typescript`), with a display label and aliases.                                                                          |
| **Extraction**      | Using the extract model (`qwen2.5:3b`) to pull skills out of a job description as structured JSON.                                                                            |
| **Embedding**       | A 768-dim vector from the embed model (`nomic-embed-text`) for a job or profile.                                                                                              |
| **Match**           | A job scored against the profile: `matchScore` (0–100) = weighted blend of vector `similarity` and `mustHaveCoverage`.                                                        |
| **Hybrid search**   | Deterministic filters (excludes, remote type, country, salary, age) applied in SQL first, then ordering by pgvector distance.                                                 |

## Pipeline

| Term                    | Meaning                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Run** (Ingestion run) | One triggered ingestion across selected sources. Has a status, stats, and start/end times. One click on "Run" = one run. |
| **Stage**               | `fetch` -> `extract` -> `embed`. Stage names are BullMQ job names.                                                       |
| **Fetch queue**         | `ingest:fetch:free` / `ingest:fetch:paid`. Split by tier so rate limits differ.                                          |
| **Enrich queue**        | `ingest:enrich`. One job per stored job per stage.                                                                       |
| **Worker**              | A BullMQ processor for a queue. Runs in the `apps/api` process (dev) or separately (prod).                               |
| **Progress event**      | An `IngestionEvent` published to Redis pub/sub by workers and relayed to the browser over SSE.                           |
| **Status bar**          | The collapsible area in `Main` that renders progress events for the active run.                                          |

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
