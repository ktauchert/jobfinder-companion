import type { HealthResponse } from "@jobfinder/types";

import type { HealthChecks } from "../ports/health-checks.js";

export interface GetHealthDeps {
  checks: HealthChecks;
  version: string;
}

/**
 * Probe infrastructure with short timeouts. Never throws — a failed probe
 * becomes `false` and overall status `degraded`.
 */
export async function getHealth(deps: GetHealthDeps): Promise<HealthResponse> {
  const [database, redis, ollama] = await Promise.all([
    safeCheck(() => deps.checks.checkDatabase()),
    safeCheck(() => deps.checks.checkRedis()),
    safeCheck(() => deps.checks.checkOllama()),
  ]);

  const ok = database && redis && ollama;
  return {
    status: ok ? "ok" : "degraded",
    checks: { database, redis, ollama },
    version: deps.version,
  };
}

async function safeCheck(fn: () => Promise<boolean>): Promise<boolean> {
  try {
    return await fn();
  } catch {
    return false;
  }
}
