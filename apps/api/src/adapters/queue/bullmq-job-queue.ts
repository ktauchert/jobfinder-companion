import type { EnrichJobData, FetchJobData, SourceTier } from "@jobfinder/types";
import { QUEUE_NAMES } from "@jobfinder/types";

import type { JobQueue } from "../../ports/job-queue.js";
import { enrichJobId, fetchJobId } from "./job-ids.js";
import type { IngestQueues } from "./queues.js";

export function createBullmqJobQueue(queues: IngestQueues): JobQueue {
  return {
    async enqueueFetch(data: FetchJobData, tier: SourceTier): Promise<void> {
      const queue = tier === "paid" ? queues.fetchPaid : queues.fetchFree;
      await queue.add("fetch", data, {
        jobId: fetchJobId(data.runId, data.source, data.query),
      });
    },

    async enqueueEnrich(data: EnrichJobData): Promise<void> {
      const queue = data.stage === "embed" ? queues.embed : queues.extract;
      await queue.add(data.stage, data, {
        jobId: enrichJobId(data.jobId, data.stage),
      });
    },

    async removeWaitingJobsByRunId(runId: string): Promise<number> {
      let removed = 0;
      for (const queue of [queues.fetchFree, queues.fetchPaid, queues.extract, queues.embed]) {
        const waiting = await queue.getJobs(["waiting", "delayed", "paused"]);
        for (const job of waiting) {
          const payload = job.data as { runId?: string };
          if (payload.runId === runId) {
            await job.remove();
            removed += 1;
          }
        }
      }
      return removed;
    },

    async close(): Promise<void> {
      await Promise.all([
        queues.fetchFree.close(),
        queues.fetchPaid.close(),
        queues.extract.close(),
        queues.embed.close(),
      ]);
    },
  };
}

/** Queue name helper for worker registration. */
export function queueNameForTier(tier: SourceTier): string {
  return tier === "paid" ? QUEUE_NAMES.fetchPaid : QUEUE_NAMES.fetchFree;
}
