import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import "./load-root-env.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const kitPath = join(packageRoot, "..", "..", "node_modules", "drizzle-kit", "bin.cjs");
const subcommand = process.argv[2];

if (!subcommand) {
  console.error("Usage: tsx src/run-drizzle-kit.ts <generate|studio|...>");
  process.exit(1);
}

const result = spawnSync(process.execPath, [kitPath, subcommand], {
  stdio: "inherit",
  env: process.env,
  cwd: packageRoot,
});

process.exit(result.status ?? 1);
