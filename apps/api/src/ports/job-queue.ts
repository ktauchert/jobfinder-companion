import type { EnrichJobData, FetchJobData, SourceTier } from "@jobfinder/types";

export interface JobQueue {
  enqueueFetch(data: FetchJobData, tier: SourceTier): Promise<void>;
  enqueueEnrich(data: EnrichJobData): Promise<void>;
  removeWaitingJobsByRunId(runId: string): Promise<number>;
  close(): Promise<void>;
}
