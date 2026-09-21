import type { EnrichJobData } from "@jobfinder/types";

import { filterExtractedSkills } from "../domain/filter-extracted-skills.js";
import { canonicaliseSkillName } from "./canonicalise-skill.js";
import { maybePublishRunProgress } from "./publish-run-progress.js";
import type { checkRunCompletion } from "./check-run-completion.js";
import type { EventPublisher } from "../ports/event-publisher.js";
import type { JobRepository } from "../ports/job-repository.js";
import type { JobQueue } from "../ports/job-queue.js";
import type { RunRepository } from "../ports/run-repository.js";
import type { SkillExtractor } from "../ports/skill-extractor.js";
import type { SkillRepository } from "../ports/skill-repository.js";

export interface ProcessExtractDeps {
  jobs: Pick<
    JobRepository,
    | "findDescriptionText"
    | "findContentHash"
    | "findJobIdWithSkillsByContentHash"
    | "markSkillsExtracted"
  >;
  skills: SkillRepository;
  extractor: SkillExtractor;
  queue: Pick<JobQueue, "enqueueEnrich">;
  runs: Pick<RunRepository, "incrementStats" | "findById" | "getStats" | "updateStatus">;
  events: EventPublisher;
  checkCompletion: typeof checkRunCompletion;
}

export async function processExtract(data: EnrichJobData, deps: ProcessExtractDeps): Promise<void> {
  const run = await deps.runs.findById(data.runId);
  if (!run || run.status === "cancelled") {
    return;
  }

  const contentHash = await deps.jobs.findContentHash(data.jobId);
  if (!contentHash) {
    throw new Error(`Job ${data.jobId} not found`);
  }

  const siblingJobId = await deps.jobs.findJobIdWithSkillsByContentHash(contentHash, data.jobId);

  if (siblingJobId) {
    await deps.skills.clearJobSkills(data.jobId);
    await deps.skills.copyJobSkills(siblingJobId, data.jobId);
    await finishExtract(data, deps);
    return;
  }

  const descriptionText = await deps.jobs.findDescriptionText(data.jobId);
  if (!descriptionText) {
    throw new Error(`Job ${data.jobId} not found`);
  }

  const extracted = filterExtractedSkills(await deps.extractor.extract(descriptionText));
  await deps.skills.clearJobSkills(data.jobId);

  for (const item of extracted) {
    const skill = await canonicaliseSkillName(item.name, { skills: deps.skills });
    await deps.skills.upsertJobSkill(data.jobId, skill.id, item.confidence);
  }

  await finishExtract(data, deps);
}

async function finishExtract(data: EnrichJobData, deps: ProcessExtractDeps): Promise<void> {
  await deps.jobs.markSkillsExtracted(data.jobId);
  await deps.runs.incrementStats(data.runId, { extracted: 1 });

  const stats = await deps.runs.getStats(data.runId);
  if (stats) {
    await maybePublishRunProgress(
      data.runId,
      { runs: deps.runs, events: deps.events },
      stats.extracted,
      "Extracting skills…",
    );
  }

  await deps.queue.enqueueEnrich({
    runId: data.runId,
    jobId: data.jobId,
    stage: "embed",
  });
}
