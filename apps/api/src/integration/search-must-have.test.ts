import {
  createDb,
  EMBEDDING_DIMENSIONS,
  jobEmbeddings,
  jobSkills,
  jobs,
  profiles,
  skills,
  type Database,
} from "@jobfinder/database";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDrizzleProfileRepositoryFromDb } from "../adapters/db/drizzle-profile-repository.js";
import { createDrizzleSearchRepositoryFromDb } from "../adapters/db/drizzle-search-repository.js";
import { searchJobs } from "../application/search-jobs.js";
import { seedSources } from "../application/seed-sources.js";
import { createDrizzleSourceRepositoryFromDb } from "../adapters/db/drizzle-source-repository.js";

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)("integration: search must-have filter", () => {
  let db: Database;
  let profileId: string;

  beforeAll(async () => {
    db = createDb(databaseUrl!);
    await db.execute(
      sql`TRUNCATE job_skills, job_embeddings, jobs, ingestion_runs RESTART IDENTITY CASCADE`,
    );

    const sources = createDrizzleSourceRepositoryFromDb(db);
    await seedSources(sources);

    const profileRepo = createDrizzleProfileRepositoryFromDb(db);
    const profile = await profileRepo.ensureDefault();
    profileId = profile.id;

    await seedJobWithSkill(db, {
      externalId: "react-job",
      title: "React Developer",
      skillName: "react",
      skillLabel: "React",
    });
    await seedJobWithSkill(db, {
      externalId: "python-job",
      title: "Python Developer",
      skillName: "python",
      skillLabel: "Python",
    });
  }, 30_000);

  afterAll(async () => {
    await db.execute(
      sql`TRUNCATE job_skills, job_embeddings, jobs, ingestion_runs RESTART IDENTITY CASCADE`,
    );
  });

  it("returns only jobs that match at least one must-have skill", async () => {
    await db
      .update(profiles)
      .set({ mustHaveSkills: ["react"], excludeSkills: [] })
      .where(eq(profiles.id, profileId));

    const response = await searchJobs(
      { limit: 20 },
      {
        profiles: createDrizzleProfileRepositoryFromDb(db),
        search: createDrizzleSearchRepositoryFromDb(db),
        embedder: stubEmbedder(),
      },
    );

    expect(response.total).toBe(1);
    expect(response.items).toHaveLength(1);
    expect(response.items[0]?.job.externalId).toBe("react-job");
    expect(response.items[0]?.skillMatches.some((m) => m.state === "must_have")).toBe(true);
  });

  it("combines must-have with exclude", async () => {
    await seedJobWithSkill(db, {
      externalId: "react-java-job",
      title: "React and Java",
      skillName: "java",
      skillLabel: "Java",
      extraSkills: [{ name: "react", label: "React" }],
    });

    await db
      .update(profiles)
      .set({ mustHaveSkills: ["react"], excludeSkills: ["java"] })
      .where(eq(profiles.id, profileId));

    const response = await searchJobs(
      { limit: 20 },
      {
        profiles: createDrizzleProfileRepositoryFromDb(db),
        search: createDrizzleSearchRepositoryFromDb(db),
        embedder: stubEmbedder(),
      },
    );

    expect(response.total).toBe(1);
    expect(response.items[0]?.job.externalId).toBe("react-job");
  });

  it("does not filter by must-have when the list is empty", async () => {
    await db
      .update(profiles)
      .set({ mustHaveSkills: [], excludeSkills: [] })
      .where(eq(profiles.id, profileId));

    const response = await searchJobs(
      { limit: 20 },
      {
        profiles: createDrizzleProfileRepositoryFromDb(db),
        search: createDrizzleSearchRepositoryFromDb(db),
        embedder: stubEmbedder(),
      },
    );

    expect(response.total).toBe(3);
    expect(response.items.length).toBeGreaterThanOrEqual(2);
  });
});

async function seedJobWithSkill(
  db: Database,
  options: {
    externalId: string;
    title: string;
    skillName: string;
    skillLabel: string;
    extraSkills?: { name: string; label: string }[];
  },
): Promise<void> {
  const vector = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0.01);

  const skillNames = [
    { name: options.skillName, label: options.skillLabel },
    ...(options.extraSkills ?? []),
  ];
  const skillRows = await Promise.all(
    skillNames.map((skill) => ensureSkill(db, skill.name, skill.label)),
  );

  const insertedJob = await db
    .insert(jobs)
    .values({
      source: "ba",
      externalId: options.externalId,
      title: options.title,
      company: "Acme",
      location: "Berlin",
      countryCode: "DE",
      remoteType: "remote",
      employmentType: "full_time",
      descriptionRaw: options.title,
      descriptionText: options.title,
      url: `https://example.com/${options.externalId}`,
      contentHash: options.externalId,
      embeddedAt: new Date(),
      skillsExtractedAt: new Date(),
    })
    .returning({ id: jobs.id });

  const jobId = insertedJob[0]?.id;
  if (!jobId) {
    throw new Error("Failed to seed job");
  }

  await db.insert(jobEmbeddings).values({
    jobId,
    model: "nomic-embed-text",
    embedding: vector,
  });

  for (const skill of skillRows) {
    await db.insert(jobSkills).values({
      jobId,
      skillId: skill.id,
      confidence: 0.9,
    });
  }
}

async function ensureSkill(db: Database, name: string, label: string) {
  const existing = await db.select().from(skills).where(eq(skills.name, name)).limit(1);
  const row = existing[0];
  if (row) {
    return row;
  }

  const inserted = await db.insert(skills).values({ name, label, aliases: [] }).returning();
  const created = inserted[0];
  if (!created) {
    throw new Error(`Failed to seed skill ${name}`);
  }
  return created;
}

function stubEmbedder() {
  return {
    model: "nomic-embed-text",
    dimensions: EMBEDDING_DIMENSIONS,
    embedQuery: async () => Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0.02),
    embedDocument: async () => Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0.02),
  };
}
