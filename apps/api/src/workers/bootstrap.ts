import type { EnrichJobData, FetchJobData } from "@jobfinder/types";
import type { Logger } from "pino";
import { Worker, type Job } from "bullmq";
import type { Redis } from "ioredis";
import { QUEUE_NAMES } from "@jobfinder/types";

import type { IngestQueues } from "../adapters/queue/queues.js";
import { closeIngestQueues } from "../adapters/queue/queues.js";

export interface WorkerBootstrap {
  start(): void;
  stop(): Promise<void>;
}

export interface WorkerHandlers {
  onFetchFree: (job: Job<FetchJobData>) => Promise<void>;
  onFetchPaid: (job: Job<FetchJobData>) => Promise<void>;
  onEnrich: (job: Job<EnrichJobData>) => Promise<void>;
}

export function createWorkerBootstrap(options: {
  connection: Redis;
  queues: IngestQueues;
  handlers: WorkerHandlers;
  logger: Logger;
}): WorkerBootstrap {
  const workers: Worker[] = [];

  return {
    start() {
      workers.push(
        new Worker<FetchJobData>(QUEUE_NAMES.fetchFree, (job) => options.handlers.onFetchFree(job), {
          connection: options.connection,
          concurrency: 2,
        }),
        new Worker<FetchJobData>(QUEUE_NAMES.fetchPaid, (job) => options.handlers.onFetchPaid(job), {
          connection: options.connection,
          concurrency: 1,
        }),
        new Worker<EnrichJobData>(QUEUE_NAMES.enrich, (job) => options.handlers.onEnrich(job), {
          connection: options.connection,
          concurrency: 2,
        }),
      );

      for (const worker of workers) {
        worker.on("failed", (job, err) => {
          options.logger.warn({ jobId: job?.id, err }, "Worker job failed");
        });
      }
    },

    async stop() {
      await Promise.all(workers.map((worker) => worker.close()));
      await closeIngestQueues(options.queues);
      await options.connection.quit();
    },
  };
}

export function registerGracefulShutdown(
  bootstrap: WorkerBootstrap,
  logger: Logger,
  onShutdown?: () => Promise<void>,
): void {
  let shuttingDown = false;

  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.info({ signal }, "Shutting down workers");

    void (async () => {
      try {
        await bootstrap.stop();
        if (onShutdown) {
          await onShutdown();
        }
        process.exit(0);
      } catch (err) {
        logger.error({ err }, "Shutdown error");
        process.exit(1);
      }
    })();
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}
