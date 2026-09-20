import type { Env } from "../env.js";

export interface WorkerConcurrency {
  fetchFree: number;
  fetchPaid: number;
  extract: number;
  embed: number;
}

export function resolveWorkerConcurrency(env: Env): WorkerConcurrency {
  if (env.INGEST_SERIAL) {
    return {
      fetchFree: env.FETCH_FREE_WORKER_CONCURRENCY ?? 1,
      fetchPaid: env.FETCH_PAID_WORKER_CONCURRENCY ?? 1,
      extract: env.EXTRACT_WORKER_CONCURRENCY ?? 1,
      embed: env.EMBED_WORKER_CONCURRENCY ?? 1,
    };
  }

  const parallel = env.OLLAMA_NUM_PARALLEL;
  const extract = env.EXTRACT_WORKER_CONCURRENCY ?? Math.max(2, Math.ceil(parallel * 0.6));
  const embed = env.EMBED_WORKER_CONCURRENCY ?? Math.max(2, parallel);

  return {
    fetchFree: env.FETCH_FREE_WORKER_CONCURRENCY ?? 2,
    fetchPaid: env.FETCH_PAID_WORKER_CONCURRENCY ?? 1,
    extract,
    embed,
  };
}
