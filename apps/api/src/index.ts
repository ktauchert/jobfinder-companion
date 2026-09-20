import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import pino from "pino";

import { createHealthChecks } from "./adapters/health/create-health-checks.js";
import { loadEnv } from "./env.js";
import { createApp } from "./http/app.js";

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
});

app.listen(env.API_PORT, () => {
  logger.info({ port: env.API_PORT }, "API listening");
});

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
