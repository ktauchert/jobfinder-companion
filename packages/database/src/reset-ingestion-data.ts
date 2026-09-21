import "./load-root-env.js";

import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const force = process.argv.includes("--force");

if (process.env.NODE_ENV === "production" && !force) {
  console.error("Refusing to reset ingestion data in production. Pass --force to override.");
  process.exit(1);
}

const client = postgres(databaseUrl, { max: 1 });

await client.unsafe(`
  TRUNCATE TABLE
    job_skills,
    job_embeddings,
    jobs,
    ingestion_runs
  RESTART IDENTITY CASCADE
`);

await client.end();

console.log("Ingestion data cleared (jobs, embeddings, runs). Profile and skills unchanged.");
