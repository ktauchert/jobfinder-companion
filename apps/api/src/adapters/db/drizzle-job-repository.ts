import { createDb, jobs, jobSkills, skills, type Database } from "@jobfinder/database";
import type { NormalizedJob } from "@jobfinder/types";
import { eq, sql } from "drizzle-orm";

import type { JobRepository, UpsertJobResult } from "../../ports/job-repository.js";

export function createDrizzleJobRepository(databaseUrl: string): JobRepository {
  return createDrizzleJobRepositoryFromDb(createDb(databaseUrl));
}

export function createDrizzleJobRepositoryFromDb(db: Database): JobRepository {
  return {
    async upsertFromNormalized(job: NormalizedJob, contentHash: string): Promise<UpsertJobResult> {
      const existing = await db
        .select({
          id: jobs.id,
          contentHash: jobs.contentHash,
          skillsExtractedAt: jobs.skillsExtractedAt,
          embeddedAt: jobs.embeddedAt,
        })
        .from(jobs)
        .where(sql`${jobs.source} = ${job.source} AND ${jobs.externalId} = ${job.externalId}`)
        .limit(1);

      const prev = existing[0];
      const changed = prev ? prev.contentHash !== contentHash : false;
      const needsEnrich = prev ? changed || prev.embeddedAt === null : true;
      const enrichStage =
        prev && !changed && prev.skillsExtractedAt && !prev.embeddedAt ? "embed" : "extract";

      const values = {
        source: job.source,
        externalId: job.externalId,
        title: job.title,
        company: job.company,
        location: job.location,
        countryCode: job.countryCode,
        remoteType: job.remoteType,
        employmentType: job.employmentType,
        salaryMin: job.salary?.min ?? null,
        salaryMax: job.salary?.max ?? null,
        salaryCurrency: job.salary?.currency ?? null,
        salaryPeriod: job.salary?.period ?? null,
        descriptionRaw: job.descriptionRaw,
        descriptionText: job.descriptionText,
        url: job.url,
        postedAt: job.postedAt ? new Date(job.postedAt) : null,
        contentHash,
        ...(changed || !prev ? { skillsExtractedAt: null, embeddedAt: null } : {}),
        updatedAt: new Date(),
      };

      if (prev) {
        await db.update(jobs).set(values).where(eq(jobs.id, prev.id));
        return {
          jobId: prev.id,
          inserted: false,
          changed,
          needsEnrich,
          enrichStage,
        };
      }

      const inserted = await db.insert(jobs).values(values).returning({ id: jobs.id });
      const row = inserted[0];
      if (!row) {
        throw new Error("Job insert failed");
      }
      return {
        jobId: row.id,
        inserted: true,
        changed: true,
        needsEnrich: true,
        enrichStage: "extract" as const,
      };
    },

    async findDescriptionText(jobId: string): Promise<string | null> {
      const rows = await db
        .select({ descriptionText: jobs.descriptionText })
        .from(jobs)
        .where(eq(jobs.id, jobId))
        .limit(1);
      return rows[0]?.descriptionText ?? null;
    },

    async findTitleCompanySkills(jobId: string) {
      const jobRows = await db
        .select({
          title: jobs.title,
          company: jobs.company,
          descriptionText: jobs.descriptionText,
        })
        .from(jobs)
        .where(eq(jobs.id, jobId))
        .limit(1);

      const job = jobRows[0];
      if (!job) {
        return null;
      }

      const skillRows = await db
        .select({ name: skills.name })
        .from(jobSkills)
        .innerJoin(skills, eq(jobSkills.skillId, skills.id))
        .where(eq(jobSkills.jobId, jobId));

      return {
        title: job.title,
        company: job.company,
        descriptionText: job.descriptionText,
        skillNames: skillRows.map((s) => s.name),
      };
    },

    async markSkillsExtracted(jobId: string): Promise<void> {
      await db
        .update(jobs)
        .set({ skillsExtractedAt: new Date(), updatedAt: new Date() })
        .where(eq(jobs.id, jobId));
    },

    async markEmbedded(jobId: string): Promise<void> {
      await db
        .update(jobs)
        .set({ embeddedAt: new Date(), updatedAt: new Date() })
        .where(eq(jobs.id, jobId));
    },

    async setHidden(jobId: string, hidden: boolean): Promise<boolean> {
      const updated = await db
        .update(jobs)
        .set({
          hiddenAt: hidden ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, jobId))
        .returning({ id: jobs.id });

      return Boolean(updated[0]);
    },
  };
}
