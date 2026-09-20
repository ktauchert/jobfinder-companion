import { describe, expect, it } from "vitest";

import { loadEnv } from "../env.js";
import { resolveWorkerConcurrency } from "./concurrency.js";

describe("resolveWorkerConcurrency", () => {
  it("derives extract and embed concurrency from OLLAMA_NUM_PARALLEL", () => {
    const env = loadEnv({
      ...baseEnv(),
      OLLAMA_NUM_PARALLEL: "6",
    });

    expect(resolveWorkerConcurrency(env)).toEqual({
      fetchFree: 2,
      fetchPaid: 1,
      extract: 4,
      embed: 6,
    });
  });

  it("uses serial concurrency when INGEST_SERIAL is true", () => {
    const env = loadEnv({
      ...baseEnv(),
      INGEST_SERIAL: "true",
      OLLAMA_NUM_PARALLEL: "6",
    });

    expect(resolveWorkerConcurrency(env)).toEqual({
      fetchFree: 1,
      fetchPaid: 1,
      extract: 1,
      embed: 1,
    });
  });

  it("honours explicit worker overrides", () => {
    const env = loadEnv({
      ...baseEnv(),
      OLLAMA_NUM_PARALLEL: "6",
      EXTRACT_WORKER_CONCURRENCY: "2",
      EMBED_WORKER_CONCURRENCY: "8",
    });

    expect(resolveWorkerConcurrency(env)).toEqual({
      fetchFree: 2,
      fetchPaid: 1,
      extract: 2,
      embed: 8,
    });
  });
});

function baseEnv(): Record<string, string> {
  return {
    NODE_ENV: "test",
    LOG_LEVEL: "info",
    DATABASE_URL: "postgresql://jobfinder:jobfinder@localhost:5432/jobfinder",
    REDIS_URL: "redis://localhost:6379",
    OLLAMA_BASE_URL: "http://localhost:11434",
    OLLAMA_EMBED_MODEL: "nomic-embed-text",
    OLLAMA_EXTRACT_MODEL: "qwen2.5:3b",
    API_PORT: "3000",
    API_BASE_URL: "http://localhost:3000",
    CORS_ORIGIN: "http://localhost:5173",
    BA_CLIENT_ID: "jobboerse-jobsuche",
    ADZUNA_APP_ID: "",
    ADZUNA_APP_KEY: "",
    APIFY_TOKEN: "",
    WORKERS_ENABLED: "true",
  };
}
