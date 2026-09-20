import "../load-root-env.js";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../schema/index.js";
import { SKILL_SEED_ENTRIES, seedSkills } from "./skills.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const client = postgres(databaseUrl, { max: 1 });
const db = drizzle(client, { schema });

try {
  await seedSkills(db);
  console.log(`Seeded ${SKILL_SEED_ENTRIES.length} skills.`);
} finally {
  await client.end();
}
