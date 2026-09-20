import { describe, expect, it } from "vitest";

import { loadEnv } from "./env.js";

const validEnv = {
  NODE_ENV: "development",
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
} as const;

describe("loadEnv", () => {
  it("returns typed config for a complete environment", () => {
    const env = loadEnv(validEnv);

    expect(env.API_PORT).toBe(3000);
    expect(env.DATABASE_URL).toBe(validEnv.DATABASE_URL);
    expect(env.ADZUNA_APP_ID).toBe("");
  });

  it("aborts with the missing variable name when a required var is absent", () => {
    const { DATABASE_URL: _removed, ...incomplete } = validEnv;

    expect(() => loadEnv(incomplete)).toThrow(/DATABASE_URL/);
  });

  it("aborts with the variable name when a value is invalid", () => {
    expect(() =>
      loadEnv({
        ...validEnv,
        API_PORT: "not-a-number",
      }),
    ).toThrow(/API_PORT/);
  });
});
