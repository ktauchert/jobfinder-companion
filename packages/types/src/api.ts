import type { IngestionRun } from "./ingestion.js";
import type { JobMatch, Skill } from "./job.js";
import type { Profile, ProfileInput } from "./profile.js";
import type { SourceKey, SourceStatus } from "./source.js";

/**
 * REST API contracts. Paths are relative to `/api`.
 * Shared between `apps/api` (implementation) and `apps/web` (TanStack Query hooks).
 */

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// GET /health
export interface HealthResponse {
  status: "ok" | "degraded";
  checks: {
    database: boolean;
    redis: boolean;
    ollama: boolean;
  };
  version: string;
}

// GET /sources
export type SourcesResponse = { sources: SourceStatus[] };

// PATCH /sources/:key
export type UpdateSourceRequest = { enabled: boolean };

// POST /ingest/start
export interface StartIngestionRequest {
  /** Defaults to all enabled + configured sources. */
  sources?: SourceKey[];
  /** Upstream search text (e.g. BA `was`). Phase 2 PoC: hardcoded in UI; Phase 3: profile ingestQueries (ADR 0005). */
  query?: string;
  location?: string;
}
export type StartIngestionResponse = { run: IngestionRun };

// POST /ingest/stop
export type StopIngestionResponse = { run: IngestionRun | null };

// GET /ingest/status
export interface IngestionStatusResponse {
  /** Currently running run, if any. */
  active: IngestionRun | null;
  recent: IngestionRun[];
}

// GET /ingest/events  -> text/event-stream of `IngestionEvent`

// GET /profile, PUT /profile
export type ProfileResponse = { profile: Profile };
export type UpdateProfileRequest = ProfileInput;

// GET /jobs
export interface SearchJobsQuery {
  /** Cursor-based pagination; opaque string from the previous response. */
  cursor?: string;
  limit?: number;
  /** Extra free-text to blend into the profile embedding for this query only. */
  q?: string;
  /** Only jobs fetched within the last N days. */
  maxAgeDays?: number;
  /** Include jobs the user hid. Default false. */
  includeHidden?: boolean;
}

export interface SearchJobsResponse {
  items: JobMatch[];
  nextCursor: string | null;
  total: number;
}

// GET /jobs/:id
export type JobResponse = { match: JobMatch };

// POST /jobs/:id/hide, DELETE /jobs/:id/hide
export type HideJobResponse = { id: string; hidden: boolean };

// GET /skills
export interface SkillsSearchQuery {
  q?: string;
  limit?: number;
}

export interface SkillsSearchResponse {
  skills: Skill[];
}
