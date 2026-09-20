import type { IngestionRunStatus, SourceKey } from "./source.js";

/**
 * Ingestion pipeline stages. A job flows fetch -> extract -> embed.
 * Stage names double as BullMQ job names.
 */
export const INGESTION_STAGES = ["fetch", "extract", "embed"] as const;
export type IngestionStage = (typeof INGESTION_STAGES)[number];

/** BullMQ queue names. Fetch is split by tier so each tier gets its own rate limits. */
export const QUEUE_NAMES = {
  fetchFree: "ingest:fetch:free",
  fetchPaid: "ingest:fetch:paid",
  enrich: "ingest:enrich",
} as const;
export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/** Payload of a `fetch` job. One per source per run. */
export interface FetchJobData {
  runId: string;
  source: SourceKey;
  /** Free-text query passed to the upstream API (e.g. "TypeScript Entwickler"). */
  query: string;
  /** Location hint for the upstream API, if supported. */
  location: string | null;
}

/** Payload of an `extract` or `embed` job. One per persisted job row. */
export interface EnrichJobData {
  runId: string;
  jobId: string;
  stage: Exclude<IngestionStage, "fetch">;
}

/** One ingestion run = one click on "Run" (or one scheduled tick). Spans all selected sources. */
export interface IngestionRun {
  id: string;
  status: IngestionRunStatus;
  sources: SourceKey[];
  startedAt: string;
  finishedAt: string | null;
  stats: IngestionRunStats;
  error: string | null;
}

export interface IngestionRunStats {
  fetched: number;
  /** New rows inserted (vs. updated duplicates). */
  inserted: number;
  updated: number;
  extracted: number;
  embedded: number;
  failed: number;
}

/**
 * Live progress event pushed to the UI via Server-Sent Events.
 * Published by workers to Redis pub/sub, relayed by the API.
 */
export type IngestionEvent =
  | { type: "run.started"; runId: string; sources: SourceKey[]; at: string }
  | {
      type: "source.progress";
      runId: string;
      source: SourceKey;
      stage: IngestionStage;
      done: number;
      /** `null` while the total is unknown (e.g. paginated APIs without a count). */
      total: number | null;
      message: string;
      at: string;
    }
  | { type: "source.completed"; runId: string; source: SourceKey; at: string }
  | { type: "source.failed"; runId: string; source: SourceKey; error: string; at: string }
  | { type: "run.completed"; runId: string; stats: IngestionRunStats; at: string }
  | { type: "run.cancelled"; runId: string; at: string }
  | { type: "run.failed"; runId: string; error: string; at: string }
  | { type: "heartbeat"; at: string };

export type IngestionEventType = IngestionEvent["type"];
