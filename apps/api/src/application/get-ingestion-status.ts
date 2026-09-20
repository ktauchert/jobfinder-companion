import type { IngestionStatusResponse } from "@jobfinder/types";

import type { RunRepository } from "../ports/run-repository.js";

export interface GetIngestionStatusDeps {
  runs: Pick<RunRepository, "findActiveRun" | "findRecentRuns">;
}

export async function getIngestionStatus(
  deps: GetIngestionStatusDeps,
): Promise<IngestionStatusResponse> {
  const [active, recent] = await Promise.all([
    deps.runs.findActiveRun(),
    deps.runs.findRecentRuns(10),
  ]);

  return { active, recent };
}
