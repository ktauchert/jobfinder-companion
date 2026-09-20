import type { HideJobResponse } from "@jobfinder/types";

import { NotFoundError } from "./errors.js";
import type { JobRepository } from "../ports/job-repository.js";

export interface SetJobHiddenInput {
  jobId: string;
  hidden: boolean;
}

export interface SetJobHiddenDeps {
  jobs: Pick<JobRepository, "setHidden">;
}

export async function setJobHidden(
  input: SetJobHiddenInput,
  deps: SetJobHiddenDeps,
): Promise<HideJobResponse> {
  const updated = await deps.jobs.setHidden(input.jobId, input.hidden);
  if (!updated) {
    throw new NotFoundError(`Job not found: ${input.jobId}`);
  }

  return { id: input.jobId, hidden: input.hidden };
}
