import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import pino from "pino";

import { createAppContext } from "./bootstrap/create-context.js";
import { createHealthChecks } from "./adapters/health/create-health-checks.js";
import { createRedisConnection } from "./adapters/queue/connection.js";
import { createAppQueues } from "./adapters/queue/queues.js";
import { ensureDefaultProfile } from "./application/ensure-default-profile.js";
import { seedSources } from "./application/seed-sources.js";
import { loadEnv } from "./env.js";
import { createApp } from "./http/app.js";
import { createWorkerBootstrap, registerGracefulShutdown } from "./workers/bootstrap.js";
import { resolveWorkerConcurrency } from "./workers/concurrency.js";
import { createWorkerHandlers } from "./workers/handlers.js";

const env = loadEnv(process.env);

const logger = pino({
  level: env.LOG_LEVEL,
  ...(env.NODE_ENV === "development"
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard" },
        },
      }
    : {}),
});

const version = readPackageVersion();
const redis = createRedisConnection(env.REDIS_URL);
const queues = createAppQueues(redis);
const ctx = createAppContext(env, redis, queues);

await seedSources(ctx.sources);
await ensureDefaultProfile(ctx.profiles);

const healthChecks = createHealthChecks({
  databaseUrl: env.DATABASE_URL,
  redisUrl: env.REDIS_URL,
  ollamaBaseUrl: env.OLLAMA_BASE_URL,
});

const app = createApp({
  env,
  logger,
  health: {
    checks: healthChecks,
    version,
  },
  ctx,
  redis,
});

const server = app.listen(env.API_PORT, () => {
  logger.info({ port: env.API_PORT }, "API listening");
});

if (env.WORKERS_ENABLED) {
  const handlers = createWorkerHandlers(ctx);

  const workerBootstrap = createWorkerBootstrap({
    connection: redis,
    queues,
    logger,
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
  registerGracefulShutdown(workerBootstrap, logger, async () => {
    await ctx.queue.close();
    await ctx.profileQueue.close();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });
}

function readPackageVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkgPath = join(here, "..", "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}
