/**
 * Job sources and their service tier.
 *
 * FREE sources can always run. PAID sources require credentials in `.env`;
 * when missing they are reported as `configured: false`, greyed out in the UI
 * and skipped by the ingestion pipeline.
 */

export const SOURCE_TIERS = ["free", "paid"] as const;
export type SourceTier = (typeof SOURCE_TIERS)[number];

export const SOURCE_KEYS = [
  // FREE / OPEN
  "ba", // Bundesagentur für Arbeit – Jobsuche API
  "greenhouse", // Greenhouse public job boards (per company slug)
  "lever", // Lever public postings (per company slug)
  // PAID / KEY-REQUIRED
  "adzuna",
  "apify",
] as const;
export type SourceKey = (typeof SOURCE_KEYS)[number];

export interface SourceDefinition {
  key: SourceKey;
  /** Human-readable label shown in the UI. */
  label: string;
  tier: SourceTier;
  /** Names of the env vars that must be non-empty for this source to run. */
  requiredEnv: readonly string[];
  /** Short description of what the source covers (region, job types). */
  description: string;
}

/** Runtime view of a source: definition + whether it is usable right now. */
export interface SourceStatus extends SourceDefinition {
  /** All `requiredEnv` values are present. Always `true` for the free tier. */
  configured: boolean;
  /** User-controlled toggle, persisted in the database. */
  enabled: boolean;
  lastRunAt: string | null;
  lastRunStatus: IngestionRunStatus | null;
}

export type IngestionRunStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
