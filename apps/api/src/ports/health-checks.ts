/** Reachability probes for GET /api/health. Short timeouts; never throw out of the use case. */
export interface HealthChecks {
  checkDatabase(): Promise<boolean>;
  checkRedis(): Promise<boolean>;
  checkOllama(): Promise<boolean>;
}
