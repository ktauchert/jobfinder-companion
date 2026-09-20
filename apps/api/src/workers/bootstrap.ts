import type { EnrichJobData, FetchJobData } from "@jobfinder/types";
import type { Logger } from "pino";
import { Worker, type Job } from "bullmq";
import type { Redis } from "ioredis";
import { QUEUE_NAMES } from "@jobfinder/types";

import type { IngestQueues } from "../adapters/queue/queues.js";
import { closeIngestQueues } from "../adapters/queue/queues.js";
import type { WorkerConcurrency } from "./concurrency.js";

export interface WorkerBootstrap {
  start(): void;
  stop(): Promise<void>;
}

export interface WorkerHandlers {
  onFetchFree: (job: Job<FetchJobData>) => Promise<void>;
  onFetchPaid: (job: Job<FetchJobData>) => Promise<void>;
  onExtract: (job: Job<EnrichJobData>) => Promise<void>;
  onEmbed: (job: Job<EnrichJobData>) => Promise<void>;
}

export function createWorkerBootstrap(options: {
  connection: Redis;
  queues: IngestQueues;
  handlers: WorkerHandlers;
  logger: Logger;
  concurrency: WorkerConcurrency;
}): WorkerBootstrap {
  const workers: Worker[] = [];

  return {
    start() {
      workers.push(
        new Worker<FetchJobData>(
          QUEUE_NAMES.fetchFree,
          (job) => options.handlers.onFetchFree(job),
          {
            connection: options.connection,
            concurrency: options.concurrency.fetchFree,
          },
        ),
        new Worker<FetchJobData>(
          QUEUE_NAMES.fetchPaid,
          (job) => options.handlers.onFetchPaid(job),
          {
            connection: options.connection,
            concurrency: options.concurrency.fetchPaid,
          },
        ),
        new Worker<EnrichJobData>(QUEUE_NAMES.extract, (job) => options.handlers.onExtract(job), {
          connection: options.connection,
          concurrency: options.concurrency.extract,
        }),
        new Worker<EnrichJobData>(QUEUE_NAMES.embed, (job) => options.handlers.onEmbed(job), {
          connection: options.connection,
          concurrency: options.concurrency.embed,
        }),
      );

      for (const worker of workers) {
        worker.on("failed", (job, err) => {
          options.logger.warn({ jobId: job?.id, err }, "Worker job failed");
        });
      }

      options.logger.info(
        {
          fetchFree: options.concurrency.fetchFree,
          fetchPaid: options.concurrency.fetchPaid,
          extract: options.concurrency.extract,
          embed: options.concurrency.embed,
          ollamaParallel: options.concurrency.extract + options.concurrency.embed,
        },
        "Workers started",
      );
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
