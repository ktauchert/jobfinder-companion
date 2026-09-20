# @jobfinder/types

Shared TypeScript types. Pure types and `as const` enums only – no runtime
dependencies, no validation logic.

| Module         | Contents                                                       |
| -------------- | -------------------------------------------------------------- |
| `source.ts`    | Source keys, tiers (`free` / `paid`), `SourceStatus`           |
| `job.ts`       | `NormalizedJob` (adapter output), `Job`, `Skill`, `JobMatch`   |
| `profile.ts`   | `Profile`, `ProfileInput` (must-haves, excludes, filters)      |
| `ingestion.ts` | Queue names, BullMQ payloads, `IngestionRun`, `IngestionEvent` |
| `api.ts`       | Request/response contracts for every REST endpoint             |

Rules:

- Add a type here when it crosses a package boundary (API <-> web, database <-> API).
- Keep package-internal types local to their package.
- Runtime validation (Zod schemas) belongs in `apps/api`, derived from these types
  via `satisfies` so the contract stays here.
