import type { FetchJobData, IngestionEvent } from "@jobfinder/types";

import { computeJobContentHash } from "../domain/job-content-hash.js";
import type { JobRepository } from "../ports/job-repository.js";
import type { JobQueue } from "../ports/job-queue.js";
import type { EventPublisher } from "../ports/event-publisher.js";
import type { RateLimiter } from "../ports/source-adapter.js";
import type { SourceAdapterRegistry } from "../ports/source-adapters.js";
import type { RunRepository } from "../ports/run-repository.js";
import { checkRunCompletion } from "./check-run-completion.js";

const PROGRESS_BATCH = 25;

export interface ProcessFetchDeps {
  adapters: SourceAdapterRegistry;
  jobs: Pick<JobRepository, "upsertFromNormalized">;
  runs: Pick<
    RunRepository,
    "incrementStats" | "adjustPending" | "findById" | "getStats" | "updateStatus"
  >;
  queue: Pick<JobQueue, "enqueueEnrich">;
  events: EventPublisher;
  limiter: RateLimiter;
  signal: AbortSignal;
}

export async function processFetch(data: FetchJobData, deps: ProcessFetchDeps): Promise<void> {
  const run = await deps.runs.findById(data.runId);
  if (!run || run.status === "cancelled") {
    return;
  }

  const adapter = deps.adapters.get(data.source);
  if (!adapter) {
    const at = new Date().toISOString();
    await deps.events.publish({
      type: "source.failed",
      runId: data.runId,
      source: data.source,
      error: `No adapter for source ${data.source}`,
      at,
    });
    await deps.runs.incrementStats(data.runId, { failed: 1 });
    await deps.runs.adjustPending(data.runId, { pendingFetch: -1 });
    await checkRunCompletion(data.runId, deps);
    return;
  }

  let fetched = 0;
  let total: number | null = null;

  try {
    for await (const job of adapter.fetch(data, {
      signal: deps.signal,
      limiter: deps.limiter,
      progress: (_done, t) => {
        total = t;
      },
    })) {
      if (deps.signal.aborted) {
        break;
      }

      const contentHash = computeJobContentHash({
        title: job.title,
        company: job.company,
        descriptionText: job.descriptionText,
      });

      const result = await deps.jobs.upsertFromNormalized(job, contentHash);
      fetched += 1;

      if (result.inserted || result.changed) {
        await deps.queue.enqueueEnrich({
          runId: data.runId,
          jobId: result.jobId,
          stage: "extract",
        });
        await deps.runs.adjustPending(data.runId, { pendingEnrich: 1 });
      }

      await deps.runs.incrementStats(data.runId, {
        fetched: 1,
        inserted: result.inserted ? 1 : 0,
        updated: result.changed && !result.inserted ? 1 : 0,
      });

      if (fetched % PROGRESS_BATCH === 0) {
        await publishProgress(deps, data, fetched, total, "Fetching jobs…");
      }
    }

    const at = new Date().toISOString();
    await deps.events.publish({
      type: "source.completed",
      runId: data.runId,
      source: data.source,
      at,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    await deps.events.publish({
      type: "source.failed",
      runId: data.runId,
      source: data.source,
      error: message,
      at: new Date().toISOString(),
    });
    await deps.runs.incrementStats(data.runId, { failed: 1 });
    throw err;
  } finally {
    await deps.runs.adjustPending(data.runId, { pendingFetch: -1 });
    await checkRunCompletion(data.runId, deps);
  }
}

async function publishProgress(
  deps: ProcessFetchDeps,
  data: FetchJobData,
  done: number,
  total: number | null,
  message: string,
): Promise<void> {
  const event: IngestionEvent = {
    type: "source.progress",
    runId: data.runId,
    source: data.source,
    stage: "fetch",
    done,
    total,
    message,
    at: new Date().toISOString(),
  };
  await deps.events.publish(event);
}
