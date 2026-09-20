import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

const envPath = resolve(import.meta.dirname, "../../../../.env");
if (existsSync(envPath)) {
  loadEnvFile(envPath);
}
