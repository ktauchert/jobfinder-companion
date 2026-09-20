import type { EnrichJobData, FetchJobData } from "@jobfinder/types";
import type { Job } from "bullmq";

import { processEmbed } from "../application/process-embed.js";
import { processExtract } from "../application/process-extract.js";
import { processFetch } from "../application/process-fetch.js";
import { checkRunCompletion } from "../application/check-run-completion.js";
import type { AppContext } from "../bootstrap/context.js";

export function createWorkerHandlers(ctx: AppContext) {
  const abortControllers = new Map<string, AbortController>();

  return {
    onFetchFree: (job: Job<FetchJobData>) => handleFetch(job, ctx, abortControllers),
    onFetchPaid: (job: Job<FetchJobData>) => handleFetch(job, ctx, abortControllers),
    onEnrich: (job: Job<EnrichJobData>) => handleEnrich(job, ctx),
  };
}

async function handleFetch(
  job: Job<FetchJobData>,
  ctx: AppContext,
  abortControllers: Map<string, AbortController>,
): Promise<void> {
  const run = await ctx.runs.findById(job.data.runId);
  if (run?.status === "cancelled") {
    return;
  }

  let controller = abortControllers.get(job.data.runId);
  if (!controller) {
    controller = new AbortController();
    abortControllers.set(job.data.runId, controller);
  }

  const limiter = ctx.createRateLimiter(`source:${job.data.source}`);

  await processFetch(job.data, {
    adapters: ctx.adapters,
    jobs: ctx.jobs,
    runs: ctx.runs,
    queue: ctx.queue,
    events: ctx.events,
    limiter,
    signal: controller.signal,
  });
}

async function handleEnrich(job: Job<EnrichJobData>, ctx: AppContext): Promise<void> {
  if (job.name === "extract" || job.data.stage === "extract") {
    await processExtract(job.data, {
      jobs: ctx.jobs,
      skills: ctx.skills,
      extractor: ctx.extractor,
      queue: ctx.queue,
      runs: ctx.runs,
      checkCompletion: checkRunCompletion,
    });
    return;
  }

  await processEmbed(job.data, {
    jobs: ctx.jobs,
    embeddings: ctx.embeddings,
    embedder: ctx.embedder,
    runs: ctx.runs,
    events: ctx.events,
    checkCompletion: checkRunCompletion,
  });
}
