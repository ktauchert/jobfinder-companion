import type { IngestionEvent } from "@jobfinder/types";

import type { EventPublisher } from "../ports/event-publisher.js";
import type { RunRepository } from "../ports/run-repository.js";

export const RUN_PROGRESS_BATCH = 25;

export interface PublishRunProgressDeps {
  runs: Pick<RunRepository, "getStats">;
  events: EventPublisher;
}

/** Emit run.progress every N settled enrich steps so the UI can show extract/embed. */
export async function maybePublishRunProgress(
  runId: string,
  deps: PublishRunProgressDeps,
  counter: number,
  message: string,
): Promise<void> {
  if (counter !== 1 && counter % RUN_PROGRESS_BATCH !== 0) {
    return;
  }

  const stats = await deps.runs.getStats(runId);
  if (!stats) {
    return;
  }

  const event: IngestionEvent = {
    type: "run.progress",
    runId,
    stats,
    message,
    at: new Date().toISOString(),
  };
  await deps.events.publish(event);
}
