import { QUEUE_NAMES } from "@jobfinder/types";
import { Queue, type QueueOptions } from "bullmq";
import type { Redis } from "ioredis";

export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 1000 },
  removeOnComplete: { age: 86_400, count: 1000 },
  removeOnFail: { age: 604_800, count: 5000 },
};

export interface IngestQueues {
  fetchFree: Queue;
  fetchPaid: Queue;
  extract: Queue;
  embed: Queue;
}

export function createIngestQueues(connection: Redis): IngestQueues {
  const opts: QueueOptions = { connection, defaultJobOptions: DEFAULT_JOB_OPTIONS };

  return {
    fetchFree: new Queue(QUEUE_NAMES.fetchFree, opts),
    fetchPaid: new Queue(QUEUE_NAMES.fetchPaid, opts),
    extract: new Queue(QUEUE_NAMES.extract, opts),
    embed: new Queue(QUEUE_NAMES.embed, opts),
  };
}

export async function closeIngestQueues(queues: IngestQueues): Promise<void> {
  await Promise.all([
    queues.fetchFree.close(),
    queues.fetchPaid.close(),
    queues.extract.close(),
    queues.embed.close(),
  ]);
}
