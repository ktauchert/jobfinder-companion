import { createDb } from "@jobfinder/database";
import type { Redis } from "ioredis";

import { RunEventCache } from "../adapters/events/run-event-cache.js";
import { createRedisEventPublisher } from "../adapters/events/redis-event-publisher.js";
import { createDrizzleJobEmbeddingRepositoryFromDb } from "../adapters/db/drizzle-job-embedding-repository.js";
import { createDrizzleJobRepositoryFromDb } from "../adapters/db/drizzle-job-repository.js";
import { createDrizzleProfileRepositoryFromDb } from "../adapters/db/drizzle-profile-repository.js";
import { createDrizzleSearchRepositoryFromDb } from "../adapters/db/drizzle-search-repository.js";
import { createDrizzleRunRepositoryFromDb } from "../adapters/db/drizzle-run-repository.js";
import { createDrizzleSkillRepositoryFromDb } from "../adapters/db/drizzle-skill-repository.js";
import { createDrizzleSourceRepositoryFromDb } from "../adapters/db/drizzle-source-repository.js";
import { createOllamaEmbedder } from "../adapters/ollama/embedder.js";
import { createOllamaSkillExtractor } from "../adapters/ollama/skill-extractor.js";
import { OllamaClient } from "../adapters/ollama/client.js";
import { createBullmqJobQueue } from "../adapters/queue/bullmq-job-queue.js";
import { createBullmqProfileQueue } from "../adapters/queue/bullmq-profile-queue.js";
import type { AppQueues } from "../adapters/queue/queues.js";
import { createRateLimiter } from "../adapters/sources/rate-limiter.js";
import { createSourceAdapterRegistry } from "../adapters/sources/create-source-adapters.js";
import { SOURCE_DEFINITIONS } from "../application/source-registry.js";
import type { Env } from "../env.js";
import type { AppContext } from "./context.js";

export function createAppContext(env: Env, redis: Redis, queues: AppQueues): AppContext {
  const db = createDb(env.DATABASE_URL);
  const eventCache = new RunEventCache();

  const events = createRedisEventPublisher(redis, (event) => {
    eventCache.remember(event);
  });

  const ollama = new OllamaClient({ baseUrl: env.OLLAMA_BASE_URL });
  const baDefinition = SOURCE_DEFINITIONS.find((d) => d.key === "ba");
  if (!baDefinition) {
    throw new Error("BA source definition missing");
  }

  return {
    env,
    sources: createDrizzleSourceRepositoryFromDb(db),
    runs: createDrizzleRunRepositoryFromDb(db),
    jobs: createDrizzleJobRepositoryFromDb(db),
    skills: createDrizzleSkillRepositoryFromDb(db),
    profiles: createDrizzleProfileRepositoryFromDb(db),
    search: createDrizzleSearchRepositoryFromDb(db),
    embeddings: createDrizzleJobEmbeddingRepositoryFromDb(db),
    queue: createBullmqJobQueue(queues),
    profileQueue: createBullmqProfileQueue(queues),
    events,
    adapters: createSourceAdapterRegistry({
      baClientId: env.BA_CLIENT_ID,
      baDefinition,
    }),
    extractor: createOllamaSkillExtractor({ client: ollama, model: env.OLLAMA_EXTRACT_MODEL }),
    embedder: createOllamaEmbedder({ client: ollama, model: env.OLLAMA_EMBED_MODEL }),
    eventCache,
    createRateLimiter: (key: string) => createRateLimiter({ key, intervalMs: 1000, redis }),
    defaultIngestQuery: "softwareentwickler",
    defaultIngestLocation: "Berlin",
  };
}
