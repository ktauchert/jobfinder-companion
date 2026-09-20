import type { IngestionEvent, IngestionRunStats } from "@jobfinder/types";

import type { EventPublisher } from "../ports/event-publisher.js";
import type { RunRepository } from "../ports/run-repository.js";

export interface CheckRunCompletionDeps {
  runs: Pick<RunRepository, "findById" | "getStats" | "updateStatus">;
  events: EventPublisher;
}

/** Mark run completed when all fetch and enrich work is settled. */
export async function checkRunCompletion(
  runId: string,
  deps: CheckRunCompletionDeps,
): Promise<void> {
  const run = await deps.runs.findById(runId);
  if (run?.status !== "running") {
    return;
  }

  const stats = await deps.runs.getStats(runId);
  if (!stats) {
    return;
  }

  if (stats.pendingFetch > 0 || stats.pendingEnrich > 0) {
    return;
  }

  const finalStatus = stats.failed > 0 ? "failed" : "completed";
  await deps.runs.updateStatus(
    runId,
    finalStatus,
    finalStatus === "failed" ? "One or more sources or jobs failed" : null,
  );

  const finishedStats = await deps.runs.getStats(runId);
  const at = new Date().toISOString();

  if (finalStatus === "failed") {
    const event: IngestionEvent = {
      type: "run.failed",
      runId,
      error: "One or more sources or jobs failed",
      at,
    };
    await deps.events.publish(event);
    return;
  }

  const event: IngestionEvent = {
    type: "run.completed",
    runId,
    stats: finishedStats ?? emptyStats(),
    at,
  };
  await deps.events.publish(event);
}

function emptyStats(): IngestionRunStats {
  return {
    fetched: 0,
    inserted: 0,
    updated: 0,
    extracted: 0,
    embedded: 0,
    failed: 0,
    pendingFetch: 0,
    pendingEnrich: 0,
  };
}
