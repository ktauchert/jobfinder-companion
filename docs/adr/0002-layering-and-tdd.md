# 0002 – Ports & adapters layering and mandatory TDD

- Status: accepted
- Date: 2026-09-20

## Context

JobFinder is built largely with AI agents. Without an explicit seam map,
agents collapse I/O, orchestration and rules into feature folders and invent
behaviour without a failing test first. We want DDD's useful parts
(ubiquitous language, clear boundaries, a few aggregates) without ceremony
(no CQRS, no domain-event framework, no repository-per-table). TDD is the
feedback loop that keeps those boundaries honest.

Alternatives considered: soft "extract pure modules when needed" (agents
won't), defer layering until Phase 2 (cheapest moment is before `apps/api`
exists), full DDD with domain events everywhere (no second consumer beyond
the existing Redis `IngestionEvent` stream).

## Decision

### D1. Ports & adapters in `apps/api` from day one

```
apps/api/src/
  domain/         pure TS: IngestionRun, Job, Profile, Match, skill canonicalise
  application/    use cases; depend on ports only
  ports/          interfaces at I/O boundaries
  adapters/       db/, queue/, ollama/, sources/, events/
  http/           Express routes → use cases
  workers/        BullMQ processors → same use cases
```

HTTP and workers are equal entry points. BullMQ implements a `JobQueue` port;
it is not part of the domain.

### D2. DDD-lite aggregates and value objects

- **IngestionRun** — status machine and stats
- **Job** — identity `(source, externalId)`, enrichment flags, content hash, hide
- **Profile** — must-haves, excludes, filters, summary
- **Match** — value object: score + skill breakdown (computed, not stored)
- **NormalizedJob** — value object at the source boundary

**Skill** is data plus a domain service `canonicalise`. No domain-event
framework, no CQRS, no saga beyond use-case orchestration.

### D3. Port existence rule

A port exists only if (i) it crosses an I/O boundary, **or** (ii) an in-memory
fake is needed for a domain/application test. Otherwise keep a concrete
module. Do not invent interfaces with a single implementation "for purity".

### D4. Hybrid search split

Repository adapter runs deterministic SQL filters + pgvector distance and
returns candidates with `similarity` and `mustHaveCoverage`. Domain
`Match.score(...)` blends weights (ADR 0001 D7). Excludes stay hard SQL.

### D5. Package boundaries

- `@jobfinder/types` — domain shapes and API DTOs (one package for now)
- `@jobfinder/database` — Drizzle schema, migrations, DB client only
- Repository adapters that implement ports live in `apps/api/src/adapters/db/`
- Domain never imports `@jobfinder/database`, BullMQ, Express, or Ollama
- `apps/web` does **not** get hexagonal layering (components + Query hooks +
  typed API client)

### D6. Mandatory TDD, always red-first

- `domain/` and `application/`: write a failing unit test first; `/code-review`
  fails the Standards axis without it
- Adapters: red-first fixture/contract tests (recorded upstream JSON, Docker
  Postgres). Research fixtures feed the red test; they do not skip it
- Characterization tests allowed only when refactoring existing untested code
- No live HTTP or Ollama in unit tests

### D7. Mechanical enforcement

ESLint `no-restricted-imports` per folder:

- `domain/` cannot import adapters, http, workers, drizzle, bullmq, express, ollama
- `application/` cannot import adapters, http, workers (ports only)
- `http/` and `workers/` call application use cases; they do not contain
  business rules

Plus the `/code-review` Standards checklist in `AGENTS.md`.

## Consequences

- Issue #2 scaffolds `apps/api` into this layout; later Phase 1 issues place
  code in the named layers.
- Agents have unambiguous seams for `/tdd` and `/implement`.
- Risk: over-abstracting ports — D3 is the kill switch; call it out in review.
- Glossary terms for queues/workers move out of `CONTEXT.md` into this ADR
  and `ARCHITECTURE.md` (implementation detail, not domain language).
