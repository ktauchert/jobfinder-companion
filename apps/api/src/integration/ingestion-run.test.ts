import { EMBEDDING_DIMENSIONS } from "@jobfinder/database";
import type { IngestionEvent } from "@jobfinder/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb, jobSkills } from "@jobfinder/database";
import { count, sql } from "drizzle-orm";
import type { Redis } from "ioredis";

import { createAppContext } from "../bootstrap/create-context.js";
import { createRedisConnection } from "../adapters/queue/connection.js";
import { closeAppQueues, createAppQueues } from "../adapters/queue/queues.js";
import { seedSources } from "../application/seed-sources.js";
import { startIngestion } from "../application/start-ingestion.js";
import { createWorkerHandlers } from "../workers/handlers.js";
import { createWorkerBootstrap } from "../workers/bootstrap.js";
import { resolveWorkerConcurrency } from "../workers/concurrency.js";
import { loadEnv } from "../env.js";
import { INGESTION_EVENTS_CHANNEL } from "../adapters/events/redis-event-publisher.js";
import { createBaAdapter } from "../adapters/sources/ba/adapter.js";
import { createBaClient } from "../adapters/sources/ba/client.js";
import { SOURCE_DEFINITIONS } from "../application/source-registry.js";
import { OllamaClient } from "../adapters/ollama/client.js";
import { createOllamaSkillExtractor } from "../adapters/ollama/skill-extractor.js";
import { createOllamaEmbedder } from "../adapters/ollama/embedder.js";
import { startFixtureBaServer } from "./fixture-ba-server.js";

const databaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL;

/** Requires Docker Postgres + Redis. Truncates jobs and runs before each suite (destructive locally). */
describe.skipIf(!databaseUrl || !redisUrl)("integration: ingestion run", () => {
  let redis: Redis;
  let subscriber: Redis;
  let baServer: { url: string; close: () => Promise<void> };
  let workerBootstrap: ReturnType<typeof createWorkerBootstrap> | undefined;
  const events: IngestionEvent[] = [];

  beforeAll(async () => {
    baServer = await startFixtureBaServer();
    redis = createRedisConnection(redisUrl!);
    await resetIntegrationState(databaseUrl!, redis);
    subscriber = redis.duplicate();
    await subscriber.subscribe(INGESTION_EVENTS_CHANNEL);
    subscriber.on("message", (_channel, payload) => {
      events.push(JSON.parse(payload) as IngestionEvent);
    });
  }, 30_000);

  afterAll(async () => {
    await workerBootstrap?.stop();
    await subscriber?.quit();
    await redis?.quit();
    await baServer?.close();
  });

  it("runs fetch → extract → embed to completion using fixture BA data", async () => {
    const env = loadEnv({
      ...process.env,
      NODE_ENV: "test",
      DATABASE_URL: databaseUrl!,
      REDIS_URL: redisUrl!,
      OLLAMA_BASE_URL: "http://127.0.0.1:9",
      OLLAMA_EXTRACT_MODEL: "qwen2.5:3b",
      OLLAMA_EMBED_MODEL: "nomic-embed-text",
      BA_CLIENT_ID: "test",
      INGEST_SERIAL: "false",
      INGEST_MAX_JOBS: "0",
      ADZUNA_APP_ID: "",
      ADZUNA_APP_KEY: "",
      APIFY_TOKEN: "",
    });

    const queues = createAppQueues(redis);
    const ctx = createAppContext(env, redis, queues);

    const baDefinition = SOURCE_DEFINITIONS.find((d) => d.key === "ba");
    if (!baDefinition) {
      throw new Error("missing ba definition");
    }

    const vector = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0.01);
    const mockOllama = {
      chat: async () =>
        JSON.stringify({
          skills: [
            { name: "typescript", confidence: 0.9 },
            { name: "react", confidence: 0.8 },
          ],
        }),
      embed: async () => [vector],
    } as unknown as OllamaClient;

    ctx.adapters = {
      get(source) {
        if (source !== "ba") {
          return null;
        }
        return createBaAdapter(
          createBaClient({
            apiKey: "test",
            fetchFn: async (input) => {
              const url =
                typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
              return fetch(url.replace("https://rest.arbeitsagentur.de", baServer.url));
            },
          }),
          baDefinition,
        );
      },
    };
    ctx.extractor = createOllamaSkillExtractor({
      client: mockOllama,
      model: "qwen2.5:3b",
    });
    ctx.embedder = createOllamaEmbedder({ client: mockOllama, model: "nomic-embed-text" });

    await seedSources(ctx.sources);

    const handlers = createWorkerHandlers(ctx);
    const workerRedis = redis.duplicate();
    workerBootstrap = createWorkerBootstrap({
      connection: workerRedis,
      queues,
      logger: { warn: () => {}, info: () => {}, error: () => {} } as never,
      concurrency: resolveWorkerConcurrency(env),
      handlers: {
        onFetchFree: (job) => handlers.onFetchFree(job),
        onFetchPaid: (job) => handlers.onFetchPaid(job),
        onExtract: (job) => handlers.onExtract(job),
        onEmbed: (job) => handlers.onEmbed(job),
        onProfileEmbed: (job) => handlers.onProfileEmbed(job),
      },
    });
    workerBootstrap.start();

    const { run } = await startIngestion(
      { sources: ["ba"], query: "softwareentwickler", location: "Berlin" },
      {
        env: {
          ADZUNA_APP_ID: "",
          ADZUNA_APP_KEY: "",
          APIFY_TOKEN: "",
        },
        sources: ctx.sources,
        runs: ctx.runs,
        queue: ctx.queue,
        events: ctx.events,
        defaultQuery: "softwareentwickler",
        defaultLocation: "Berlin",
      },
    );

    const deadline = Date.now() + 55_000;
    let final = await ctx.runs.findById(run.id);
    while (final && final.status === "running" && Date.now() < deadline) {
      await sleep(500);
      final = await ctx.runs.findById(run.id);
    }

    expect(final?.status).toBe("completed");

    const stats = final?.stats;
    expect(stats?.fetched).toBeGreaterThanOrEqual(2);
    expect(stats?.embedded).toBeGreaterThanOrEqual(2);
    expect(stats?.embedded).toBe(stats?.extracted);

    const db = createDb(databaseUrl!);
    const [skillLinkCount] = await db.select({ value: count() }).from(jobSkills);
    expect(skillLinkCount?.value ?? 0).toBeGreaterThan(0);

    expect(events.some((e) => e.type === "run.started")).toBe(true);
    expect(events.some((e) => e.type === "run.completed")).toBe(true);
  }, 60_000);
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Clear stale runs and BullMQ keys so local re-runs match CI's fresh Postgres. */
async function resetIntegrationState(databaseUrl: string, connection: Redis): Promise<void> {
  const db = createDb(databaseUrl);
  await db.execute(
    sql`TRUNCATE job_skills, job_embeddings, jobs, ingestion_runs RESTART IDENTITY CASCADE`,
  );

  const queues = createAppQueues(connection);
  await Promise.all([
    queues.fetchFree.obliterate({ force: true }),
    queues.fetchPaid.obliterate({ force: true }),
    queues.extract.obliterate({ force: true }),
    queues.embed.obliterate({ force: true }),
    queues.profileEmbed.obliterate({ force: true }),
  ]);
  await closeAppQueues(queues);
}
