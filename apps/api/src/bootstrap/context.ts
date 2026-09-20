import type { Embedder } from "../ports/embedder.js";
import type { EventPublisher } from "../ports/event-publisher.js";
import type { JobEmbeddingRepository } from "../ports/job-embedding-repository.js";
import type { JobQueue } from "../ports/job-queue.js";
import type { JobRepository } from "../ports/job-repository.js";
import type { ProfileQueue } from "../ports/profile-queue.js";
import type { ProfileRepository } from "../ports/profile-repository.js";
import type { RateLimiter } from "../ports/source-adapter.js";
import type { SourceAdapterRegistry } from "../ports/source-adapters.js";
import type { RunRepository } from "../ports/run-repository.js";
import type { SearchRepository } from "../ports/search-repository.js";
import type { SkillExtractor } from "../ports/skill-extractor.js";
import type { SkillRepository } from "../ports/skill-repository.js";
import type { SourceRepository } from "../ports/source-repository.js";
import type { RunEventCache } from "../adapters/events/run-event-cache.js";
import type { Env } from "../env.js";

export interface AppContext {
  env: Env;
  sources: SourceRepository;
  runs: RunRepository;
  jobs: JobRepository;
  skills: SkillRepository;
  profiles: ProfileRepository;
  search: SearchRepository;
  embeddings: JobEmbeddingRepository;
  queue: JobQueue;
  profileQueue: ProfileQueue;
  events: EventPublisher;
  /** Mutable for integration tests that swap the BA client base URL. */
  adapters: SourceAdapterRegistry;
  /** Mutable for integration tests that mock Ollama. */
  extractor: SkillExtractor;
  /** Mutable for integration tests that mock Ollama. */
  embedder: Embedder;
  eventCache: RunEventCache;
  createRateLimiter(key: string): RateLimiter;
  defaultIngestQuery: string;
  defaultIngestLocation: string | null;
}
