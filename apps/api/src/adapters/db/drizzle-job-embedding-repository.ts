import { createDb, jobEmbeddings, type Database } from "@jobfinder/database";
import { eq } from "drizzle-orm";

import type { JobEmbeddingRepository } from "../../ports/job-embedding-repository.js";

export function createDrizzleJobEmbeddingRepository(databaseUrl: string): JobEmbeddingRepository {
  return createDrizzleJobEmbeddingRepositoryFromDb(createDb(databaseUrl));
}

export function createDrizzleJobEmbeddingRepositoryFromDb(db: Database): JobEmbeddingRepository {
  return {
    async upsert(jobId: string, model: string, embedding: number[]) {
      const existing = await db
        .select({ jobId: jobEmbeddings.jobId })
        .from(jobEmbeddings)
        .where(eq(jobEmbeddings.jobId, jobId))
        .limit(1);

      if (existing[0]) {
        await db
          .update(jobEmbeddings)
          .set({ model, embedding })
          .where(eq(jobEmbeddings.jobId, jobId));
        return;
      }

      await db.insert(jobEmbeddings).values({ jobId, model, embedding });
    },
  };
}
