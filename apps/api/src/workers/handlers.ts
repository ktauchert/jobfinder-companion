import type { EnrichJobData, FetchJobData, ProfileEmbedJobData } from "@jobfinder/types";
import type { Job } from "bullmq";

import { processEmbed } from "../application/process-embed.js";
import { processExtract } from "../application/process-extract.js";
import { processFetch } from "../application/process-fetch.js";
import { processProfileEmbed } from "../application/process-profile-embed.js";
import { checkRunCompletion } from "../application/check-run-completion.js";
import type { AppContext } from "../bootstrap/context.js";

export function createWorkerHandlers(ctx: AppContext) {
  const abortControllers = new Map<string, AbortController>();

  return {
    onFetchFree: (job: Job<FetchJobData>) => handleFetch(job, ctx, abortControllers),
    onFetchPaid: (job: Job<FetchJobData>) => handleFetch(job, ctx, abortControllers),
    onExtract: (job: Job<EnrichJobData>) => handleExtract(job, ctx),
    onEmbed: (job: Job<EnrichJobData>) => handleEmbed(job, ctx),
    onProfileEmbed: (job: Job<ProfileEmbedJobData>) => handleProfileEmbed(job, ctx),
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

  const maxJobs = ctx.env.INGEST_MAX_JOBS > 0 ? ctx.env.INGEST_MAX_JOBS : null;

  await processFetch(job.data, {
    adapters: ctx.adapters,
    jobs: ctx.jobs,
    runs: ctx.runs,
    queue: ctx.queue,
    events: ctx.events,
    limiter,
    signal: controller.signal,
    maxJobs,
  });
}

async function handleExtract(job: Job<EnrichJobData>, ctx: AppContext): Promise<void> {
  await processExtract(job.data, {
    jobs: ctx.jobs,
    skills: ctx.skills,
    extractor: ctx.extractor,
    queue: ctx.queue,
    runs: ctx.runs,
    events: ctx.events,
    checkCompletion: checkRunCompletion,
  });
}

async function handleEmbed(job: Job<EnrichJobData>, ctx: AppContext): Promise<void> {
  await processEmbed(job.data, {
    jobs: ctx.jobs,
    embeddings: ctx.embeddings,
    embedder: ctx.embedder,
    runs: ctx.runs,
    events: ctx.events,
    checkCompletion: checkRunCompletion,
  });
}

async function handleProfileEmbed(job: Job<ProfileEmbedJobData>, ctx: AppContext): Promise<void> {
  await processProfileEmbed(job.data, {
    profiles: ctx.profiles,
    embedder: ctx.embedder,
  });
}
