import {
  EMPLOYMENT_TYPES,
  REMOTE_TYPES,
  SOURCE_KEYS,
  SOURCE_TIERS,
  type IngestionRunStats,
} from "@jobfinder/types";
import type { InferSelectModel } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  unique,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

import { EMBEDDING_DIMENSIONS } from "../vector.js";

/** Convenience helper: `vector(768)` column for job/profile embeddings. */
export function embeddingColumn(name: string) {
  return vector(name, { dimensions: EMBEDDING_DIMENSIONS });
}

export const sourceTierEnum = pgEnum("source_tier", SOURCE_TIERS);
export const remoteTypeEnum = pgEnum("remote_type", REMOTE_TYPES);
export const employmentTypeEnum = pgEnum("employment_type", EMPLOYMENT_TYPES);
export const ingestionRunStatusEnum = pgEnum("ingestion_run_status", [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
]);
export const salaryPeriodEnum = pgEnum("salary_period", ["year", "month", "day", "hour"]);
export const sourceKeyEnum = pgEnum("source_key", SOURCE_KEYS);

export const sources = pgTable("sources", {
  key: sourceKeyEnum("key").primaryKey(),
  tier: sourceTierEnum("tier").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: sourceKeyEnum("source")
      .notNull()
      .references(() => sources.key),
    externalId: text("external_id").notNull(),
    title: text("title").notNull(),
    company: text("company"),
    location: text("location"),
    countryCode: text("country_code"),
    remoteType: remoteTypeEnum("remote_type").notNull().default("unknown"),
    employmentType: employmentTypeEnum("employment_type").notNull().default("unknown"),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    salaryCurrency: text("salary_currency"),
    salaryPeriod: salaryPeriodEnum("salary_period"),
    descriptionRaw: text("description_raw").notNull(),
    descriptionText: text("description_text").notNull(),
    url: text("url").notNull(),
    postedAt: timestamp("posted_at", { withTimezone: true, mode: "date" }),
    contentHash: text("content_hash").notNull(),
    skillsExtractedAt: timestamp("skills_extracted_at", { withTimezone: true, mode: "date" }),
    embeddedAt: timestamp("embedded_at", { withTimezone: true, mode: "date" }),
    hiddenAt: timestamp("hidden_at", { withTimezone: true, mode: "date" }),
    fetchedAt: timestamp("fetched_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    unique("jobs_source_external_id_uidx").on(table.source, table.externalId),
    index("jobs_fetched_at_idx").on(table.fetchedAt),
    index("jobs_hidden_at_idx").on(table.hiddenAt),
  ],
);

export const skills = pgTable(
  "skills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().unique(),
    label: text("label").notNull(),
    aliases: text("aliases")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
  },
  (table) => [
    // gin_trgm_ops is text-only (not text[]). Fuzzy match uses name/label;
    // aliases stay a GIN array index for containment lookups.
    index("skills_name_trgm_idx").using("gin", sql`${table.name} gin_trgm_ops`),
    index("skills_label_trgm_idx").using("gin", sql`${table.label} gin_trgm_ops`),
    index("skills_aliases_gin_idx").using("gin", table.aliases),
  ],
);

export const jobSkills = pgTable(
  "job_skills",
  {
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    confidence: real("confidence").notNull(),
  },
  (table) => [primaryKey({ columns: [table.jobId, table.skillId] })],
);

export const jobEmbeddings = pgTable(
  "job_embeddings",
  {
    jobId: uuid("job_id")
      .primaryKey()
      .references(() => jobs.id, { onDelete: "cascade" }),
    model: text("model").notNull(),
    embedding: embeddingColumn("embedding").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("job_embeddings_embedding_hnsw_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  ],
);

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    mustHaveSkills: text("must_have_skills")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    excludeSkills: text("exclude_skills")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    summary: text("summary").notNull().default(""),
    ingestQueries: text("ingest_queries")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    remoteTypes: text("remote_types")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    countryCodes: text("country_codes")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    minSalary: integer("min_salary"),
    /** Blend of vector similarity vs must-have coverage. Coverage weight is the complement. */
    similarityWeight: real("similarity_weight").notNull().default(0.6),
    maxAgeDays: integer("max_age_days"),
    embedding: embeddingColumn("embedding"),
    embeddedAt: timestamp("embedded_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("profiles_embedding_hnsw_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
  ],
);

export const ingestionRuns = pgTable("ingestion_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: ingestionRunStatusEnum("status").notNull().default("queued"),
  sources: text("sources")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true, mode: "date" }),
  stats: jsonb("stats").$type<IngestionRunStats>().notNull().default({
    fetched: 0,
    inserted: 0,
    updated: 0,
    extracted: 0,
    embedded: 0,
    failed: 0,
    pendingFetch: 0,
    pendingEnrich: 0,
  }),
  error: text("error"),
});

export type SourceRow = InferSelectModel<typeof sources>;
export type JobRow = InferSelectModel<typeof jobs>;
export type SkillRow = InferSelectModel<typeof skills>;
export type JobSkillRow = InferSelectModel<typeof jobSkills>;
export type JobEmbeddingRow = InferSelectModel<typeof jobEmbeddings>;
export type ProfileRow = InferSelectModel<typeof profiles>;
export type IngestionRunRow = InferSelectModel<typeof ingestionRuns>;
