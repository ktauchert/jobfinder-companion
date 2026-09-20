import type { SourcesResponse } from "@jobfinder/types";

import {
  isSourceConfigured,
  SOURCE_DEFINITIONS,
  type SourceEnv,
} from "./source-registry.js";
import type { SourceRepository } from "../ports/source-repository.js";

export interface GetSourcesDeps {
  env: SourceEnv;
  sources: Pick<SourceRepository, "findAll" | "findLastRunBySource">;
}

export async function getSources(deps: GetSourcesDeps): Promise<SourcesResponse> {
  const rows = await deps.sources.findAll();
  const rowByKey = new Map(rows.map((row) => [row.key, row]));

  const sources = await Promise.all(
    SOURCE_DEFINITIONS.map(async (def) => {
      const row = rowByKey.get(def.key);
      const lastRun = await deps.sources.findLastRunBySource(def.key);

      return {
        ...def,
        configured: isSourceConfigured(def, deps.env),
        enabled: row?.enabled ?? true,
        lastRunAt: lastRun ? lastRun.startedAt.toISOString() : null,
        lastRunStatus: lastRun?.status ?? null,
      };
    }),
  );

  return { sources };
}
