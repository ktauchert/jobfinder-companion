import type {
  IngestionEvent,
  SourceKey,
  StartIngestionRequest,
  StartIngestionResponse,
} from "@jobfinder/types";

import { isSourceConfigured, SOURCE_DEFINITIONS } from "./source-registry.js";
import type { SourceEnv } from "./source-registry.js";
import { ConflictError } from "./errors.js";
import type { JobQueue } from "../ports/job-queue.js";
import type { EventPublisher } from "../ports/event-publisher.js";
import type { RunRepository } from "../ports/run-repository.js";
import type { SourceRepository } from "../ports/source-repository.js";

export interface StartIngestionDeps {
  env: SourceEnv;
  sources: Pick<SourceRepository, "findAll">;
  runs: RunRepository;
  queue: JobQueue;
  events: EventPublisher;
  defaultQuery: string;
  defaultLocation: string | null;
}

export async function startIngestion(
  input: StartIngestionRequest,
  deps: StartIngestionDeps,
): Promise<StartIngestionResponse> {
  const active = await deps.runs.findActiveRun();
  if (active) {
    throw new ConflictError("An ingestion run is already active");
  }

  const rows = await deps.sources.findAll();
  const enabled = new Set(rows.filter((r) => r.enabled).map((r) => r.key));

  const selected = resolveSources(input.sources, enabled, deps.env);
  if (selected.length === 0) {
    throw new ConflictError("No enabled and configured sources to ingest");
  }

  const trimmedQuery = input.query?.trim();
  const trimmedLocation = input.location?.trim();
  const query = trimmedQuery && trimmedQuery.length > 0 ? trimmedQuery : deps.defaultQuery;
  const location =
    trimmedLocation && trimmedLocation.length > 0 ? trimmedLocation : deps.defaultLocation;

  const run = await deps.runs.createRun({
    sources: selected,
    pendingFetch: selected.length,
  });

  for (const source of selected) {
    const def = SOURCE_DEFINITIONS.find((d) => d.key === source);
    const tier = def?.tier ?? "free";
    await deps.queue.enqueueFetch({ runId: run.id, source, query, location }, tier);
  }

  const event: IngestionEvent = {
    type: "run.started",
    runId: run.id,
    sources: selected,
    at: new Date().toISOString(),
  };
  await deps.events.publish(event);

  return { run };
}

function resolveSources(
  requested: SourceKey[] | undefined,
  enabled: Set<SourceKey>,
  env: SourceEnv,
): SourceKey[] {
  const candidates = requested?.length ? requested : (["ba"] satisfies SourceKey[]);

  return candidates.filter((key) => {
    const def = SOURCE_DEFINITIONS.find((d) => d.key === key);
    if (!def || !enabled.has(key)) {
      return false;
    }
    return isSourceConfigured(def, env);
  });
}
