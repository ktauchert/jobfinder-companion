import type { EnrichJobData } from "@jobfinder/types";

import { maybePublishRunProgress } from "./publish-run-progress.js";
import type { checkRunCompletion } from "./check-run-completion.js";
import type { Embedder } from "../ports/embedder.js";
import type { EventPublisher } from "../ports/event-publisher.js";
import type { JobRepository } from "../ports/job-repository.js";
import type { JobEmbeddingRepository } from "../ports/job-embedding-repository.js";
import type { RunRepository } from "../ports/run-repository.js";

export interface ProcessEmbedDeps {
  jobs: Pick<JobRepository, "findTitleCompanySkills" | "markEmbedded">;
  embeddings: JobEmbeddingRepository;
  embedder: Embedder;
  runs: Pick<
    RunRepository,
    "incrementStats" | "adjustPending" | "findById" | "getStats" | "updateStatus"
  >;
  events: EventPublisher;
  checkCompletion: typeof checkRunCompletion;
}

export async function processEmbed(data: EnrichJobData, deps: ProcessEmbedDeps): Promise<void> {
  const run = await deps.runs.findById(data.runId);
  if (!run || run.status === "cancelled") {
    return;
  }

  const row = await deps.jobs.findTitleCompanySkills(data.jobId);
  if (!row) {
    throw new Error(`Job ${data.jobId} not found`);
  }

  const text = [row.title, row.company ?? "", row.skillNames.join(" "), row.descriptionText]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 8000);

  const vector = await deps.embedder.embedDocument(text);
  if (vector.length !== deps.embedder.dimensions) {
    throw new Error(
      `Embedding dimension mismatch for model ${deps.embedder.model}: expected ${deps.embedder.dimensions}, got ${vector.length}`,
    );
  }

  await deps.embeddings.upsert(data.jobId, deps.embedder.model, vector);
  await deps.jobs.markEmbedded(data.jobId);
  await deps.runs.incrementStats(data.runId, { embedded: 1 });
  await deps.runs.adjustPending(data.runId, { pendingEnrich: -1 });

  const stats = await deps.runs.getStats(data.runId);
  if (stats) {
    await maybePublishRunProgress(
      data.runId,
      { runs: deps.runs, events: deps.events },
      stats.embedded,
      "Embedding jobs…",
    );
  }
  await deps.checkCompletion(data.runId, deps);
}
