import type { EnrichJobData, SourceKey } from "@jobfinder/types";

export function fetchJobId(runId: string, source: SourceKey): string {
  return `fetch:${runId}:${source}`;
}

export function enrichJobId(jobId: string, stage: EnrichJobData["stage"]): string {
  return `enrich:${jobId}:${stage}`;
}
