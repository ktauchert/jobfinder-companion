import { createDb, type Database } from "@jobfinder/database";
import { sql } from "drizzle-orm";

import type { SearchQuery, SearchRepository } from "../../ports/search-repository.js";
import { loadJobsWithSkills } from "./load-jobs-with-skills.js";

export function createDrizzleSearchRepository(databaseUrl: string): SearchRepository {
  return createDrizzleSearchRepositoryFromDb(createDb(databaseUrl));
}

export function createDrizzleSearchRepositoryFromDb(db: Database): SearchRepository {
  return {
    async searchCandidates(query, vectorLimit) {
      const rows = await runCandidateQuery(db, query, vectorLimit);
      return rows.map((row) => ({
        jobId: row.job_id,
        similarity: row.similarity,
        mustHaveCoverage: row.must_have_coverage,
      }));
    },

    async countMatching(query) {
      const rows = await db.execute(buildCountSql(query));
      const row = rows[0] as { count: string } | undefined;
      return row ? Number(row.count) : 0;
    },

    async loadJobsByIds(jobIds) {
      const jobsById = await loadJobsWithSkills(db, jobIds);
      return jobIds
        .map((id) => jobsById.get(id))
        .filter((job): job is NonNullable<typeof job> => job != null);
    },

    async findEnrichedJobById(jobId) {
      const rows = await db.execute(sql`
        SELECT j.id
        FROM jobs j
        WHERE j.id = ${jobId}
          AND j.embedded_at IS NOT NULL
        LIMIT 1
      `);
      if (!rows[0]) {
        return null;
      }

      const jobsById = await loadJobsWithSkills(db, [jobId]);
      return jobsById.get(jobId) ?? null;
    },

    async computeCandidateMetrics(jobId, query) {
      if (!query.queryEmbedding) {
        return { similarity: 0, mustHaveCoverage: 0 };
      }

      const rows = await db.execute(buildMetricsSql(query, jobId));

      const row = rows[0] as { similarity: number; must_have_coverage: number } | undefined;
      if (!row) {
        return null;
      }

      return {
        similarity: row.similarity,
        mustHaveCoverage: row.must_have_coverage,
      };
    },
  };
}

interface CandidateRow {
  job_id: string;
  similarity: number;
  must_have_coverage: number;
  [key: string]: unknown;
}

async function runCandidateQuery(
  db: Database,
  query: SearchQuery,
  vectorLimit: number,
): Promise<CandidateRow[]> {
  const result = await db.execute(buildCandidateSql(query, vectorLimit));
  return result as unknown as CandidateRow[];
}

function embeddingLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

function buildCandidateSql(query: SearchQuery, vectorLimit: number) {
  const filters = buildFilterSql(query);
  const orderClause = query.queryEmbedding
    ? sql`ORDER BY e.embedding <=> ${embeddingLiteral(query.queryEmbedding)}::vector`
    : sql`ORDER BY j.fetched_at DESC`;

  return sql`
    WITH p AS (
      SELECT *
      FROM profiles
      WHERE id = ${query.profileId}
    )
    SELECT
      j.id AS job_id,
      ${
        query.queryEmbedding
          ? sql`1 - (e.embedding <=> ${embeddingLiteral(query.queryEmbedding)}::vector)`
          : sql`0::float`
      } AS similarity,
      coalesce(mh.hits, 0)::float / greatest(cardinality(p.must_have_skills), 1) AS must_have_coverage
    FROM jobs j
    JOIN job_embeddings e ON e.job_id = j.id
    CROSS JOIN p
    LEFT JOIN LATERAL (
      SELECT count(*)::int AS hits
      FROM job_skills js
      JOIN skills s ON s.id = js.skill_id
      WHERE js.job_id = j.id
        AND s.name = ANY (p.must_have_skills)
    ) mh ON true
    WHERE j.embedded_at IS NOT NULL
      ${filters}
    ${orderClause}
    LIMIT ${vectorLimit}
  `;
}

function buildCountSql(query: SearchQuery) {
  const filters = buildFilterSql(query);

  return sql`
    WITH p AS (
      SELECT *
      FROM profiles
      WHERE id = ${query.profileId}
    )
    SELECT count(*)::text AS count
    FROM jobs j
    JOIN job_embeddings e ON e.job_id = j.id
    CROSS JOIN p
    WHERE j.embedded_at IS NOT NULL
      ${filters}
  `;
}

function buildMetricsSql(query: SearchQuery, jobId: string) {
  const filters = buildFilterSql(query);

  return sql`
    WITH p AS (
      SELECT *
      FROM profiles
      WHERE id = ${query.profileId}
    )
    SELECT
      1 - (e.embedding <=> ${embeddingLiteral(query.queryEmbedding!)}::vector) AS similarity,
      coalesce(mh.hits, 0)::float / greatest(cardinality(p.must_have_skills), 1) AS must_have_coverage
    FROM jobs j
    JOIN job_embeddings e ON e.job_id = j.id
    CROSS JOIN p
    LEFT JOIN LATERAL (
      SELECT count(*)::int AS hits
      FROM job_skills js
      JOIN skills s ON s.id = js.skill_id
      WHERE js.job_id = j.id
        AND s.name = ANY (p.must_have_skills)
    ) mh ON true
    WHERE j.id = ${jobId}
      AND j.embedded_at IS NOT NULL
      ${filters}
    LIMIT 1
  `;
}

function buildFilterSql(query: SearchQuery) {
  const includeHidden = query.includeHidden ?? false;
  const maxAgeDays = query.maxAgeDays;

  return sql`
    AND (${includeHidden} OR j.hidden_at IS NULL)
    AND NOT EXISTS (
      SELECT 1
      FROM job_skills js
      JOIN skills s ON s.id = js.skill_id
      WHERE js.job_id = j.id
        AND s.name = ANY (p.exclude_skills)
    )
    AND (
      cardinality(p.must_have_skills) = 0
      OR EXISTS (
        SELECT 1
        FROM job_skills js
        JOIN skills s ON s.id = js.skill_id
        WHERE js.job_id = j.id
          AND s.name = ANY (p.must_have_skills)
      )
    )
    AND (
      cardinality(p.remote_types) = 0
      OR j.remote_type::text = ANY (p.remote_types)
    )
    AND (
      cardinality(p.country_codes) = 0
      OR j.country_code = ANY (p.country_codes)
    )
    AND (
      p.min_salary IS NULL
      OR j.salary_max IS NULL
      OR j.salary_max >= p.min_salary
    )
    ${
      maxAgeDays != null
        ? sql`AND j.fetched_at > now() - (${maxAgeDays}::text || ' days')::interval`
        : sql``
    }
  `;
}
