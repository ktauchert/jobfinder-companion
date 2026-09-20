import type { HealthChecks } from "../../ports/health-checks.js";
import { pingDatabase } from "../db/ping.js";
import { pingOllama } from "../ollama/ping.js";
import { pingRedis } from "../queue/ping.js";

const DEFAULT_TIMEOUT_MS = 1_500;

export interface CreateHealthChecksOptions {
  databaseUrl: string;
  redisUrl: string;
  ollamaBaseUrl: string;
  timeoutMs?: number;
}

/** Compose the three infra pings used by GET /api/health. */
export function createHealthChecks(options: CreateHealthChecksOptions): HealthChecks {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    checkDatabase: () => pingDatabase(options.databaseUrl, timeoutMs),
    checkRedis: () => pingRedis(options.redisUrl, timeoutMs),
    checkOllama: () => pingOllama(options.ollamaBaseUrl, timeoutMs),
  };
}
