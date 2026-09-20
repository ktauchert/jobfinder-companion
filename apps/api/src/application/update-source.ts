import type { SourceKey, SourcesResponse, UpdateSourceRequest } from "@jobfinder/types";
import { SOURCE_KEYS } from "@jobfinder/types";

import type { SourceEnv } from "./source-registry.js";
import type { SourceRepository } from "../ports/source-repository.js";
import { NotFoundError } from "./errors.js";
import { getSources, type GetSourcesDeps } from "./get-sources.js";

export interface UpdateSourceDeps {
  env: SourceEnv;
  sources: Pick<SourceRepository, "setEnabled" | "findAll" | "findLastRunBySource">;
}

export async function updateSource(
  input: UpdateSourceRequest & { key: SourceKey },
  deps: UpdateSourceDeps,
): Promise<SourcesResponse> {
  if (!SOURCE_KEYS.includes(input.key)) {
    throw new NotFoundError(`Unknown source: ${input.key}`);
  }

  const updated = await deps.sources.setEnabled(input.key, input.enabled);
  if (!updated) {
    throw new NotFoundError(`Unknown source: ${input.key}`);
  }

  return getSources(deps satisfies GetSourcesDeps);
}
