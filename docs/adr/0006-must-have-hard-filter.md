# 0006 – Must-have skills as hard filter

- Status: accepted
- Date: 2026-09-22

## Context

Phase 2 treated **must-have skills** as a ranking signal (`mustHaveCoverage` in
`matchScore`) while **exclude skills** hard-filtered in SQL. The Tag bar presents
both fields symmetrically; users expect Skills to narrow the job list the way
Exclude does.

In practice, **Search `q`** (embedding blend) and **must-have** behaved very
differently: `q=react` surfaced many React jobs; must-have React did not, because
vector top-K ran over the full pool and must-haves only boosted score inside that
window. See `docs/SEARCH-AND-EMBEDDINGS.md` and issue #56.

## Decision

When `profiles.must_have_skills` is **non-empty**, a job must have **at least
one** listed skill in `job_skills` (OR semantics) to appear in search results.
Empty must-have list = no skill requirement (unchanged).

Implementation: extend `buildFilterSql` in `drizzle-search-repository.ts` with
an `EXISTS` subquery, same layer as exclude filters. Vector ordering and
`matchScore` run on the filtered pool; `mustHaveCoverage` remains for ranking
among survivors.

**Not changed:**

- Exclude still hard-filters.
- Search `q` still ad-hoc embedding blend.
- AND semantics (job must contain all must-haves) — deferred; OR matches
  “show jobs matching any of my target skills”.

## Consequences

**Easier:** Tag bar Skills align with user mental model; must-have React matches
skill-based expectations; `total` reflects filtered count.

**Harder:** Jobs mentioning a skill in prose but missing `job_skills` rows are
hidden; users can still use Search `q` for semantic recall. Skill extraction
quality matters more.

**Remember:** Run integration tests for search when changing filters; document
in `SEARCH-AND-EMBEDDINGS.md`.

## Supersedes / related

- Updates behaviour described in Phase 2 docs (ARCHITECTURE §8, CONTEXT Must-have).
- Related: ADR 0005 D4 (ingest vs search vs must-have — still valid).
