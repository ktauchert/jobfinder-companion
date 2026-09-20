import type { IngestionEvent, StopIngestionResponse } from "@jobfinder/types";

import type { JobQueue } from "../ports/job-queue.js";
import type { EventPublisher } from "../ports/event-publisher.js";
import type { RunRepository } from "../ports/run-repository.js";

export interface StopIngestionDeps {
  runs: RunRepository;
  queue: Pick<JobQueue, "removeWaitingJobsByRunId">;
  events: EventPublisher;
}

export async function stopIngestion(deps: StopIngestionDeps): Promise<StopIngestionResponse> {
  const active = await deps.runs.findActiveRun();
  if (!active) {
    return { run: null };
  }

  await deps.runs.updateStatus(active.id, "cancelled");
  await deps.queue.removeWaitingJobsByRunId(active.id);

  const event: IngestionEvent = {
    type: "run.cancelled",
    runId: active.id,
    at: new Date().toISOString(),
  };
  await deps.events.publish(event);

  const run = await deps.runs.findById(active.id);
  return { run };
}
