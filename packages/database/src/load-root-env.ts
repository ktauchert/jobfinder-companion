import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

/**
 * Load repo-root `.env` when present (local dev).
 * CI and scripts that export DATABASE_URL skip this silently.
 */
export function loadRootEnv(): void {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  const envPath = resolve(repoRoot, ".env");
  if (existsSync(envPath)) {
    loadEnvFile(envPath);
  }
}

loadRootEnv();
