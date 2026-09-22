import type { EnrichJobData, SourceKey } from "@jobfinder/types";

export function fetchJobId(runId: string, source: SourceKey, query: string): string {
  const slug = query
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  // BullMQ custom ids must split into exactly three ':' segments (repeatable-job compat).
  return `fetch:${runId}:${source}-${slug || "default"}`;
}

export function enrichJobId(jobId: string, stage: EnrichJobData["stage"]): string {
  return `enrich:${jobId}:${stage}`;
}
