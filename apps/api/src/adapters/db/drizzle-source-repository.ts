import { createDb, ingestionRuns, sources, type Database } from "@jobfinder/database";
import type { SourceKey } from "@jobfinder/types";
import { arrayContains, desc, eq } from "drizzle-orm";

import type { SourceLastRun, SourceRepository, SourceRow } from "../../ports/source-repository.js";

export function createDrizzleSourceRepository(databaseUrl: string): SourceRepository {
  const db = createDb(databaseUrl);
  return createDrizzleSourceRepositoryFromDb(db);
}

export function createDrizzleSourceRepositoryFromDb(db: Database): SourceRepository {
  return {
    async ensureSeeded(rows: SourceRow[]): Promise<void> {
      for (const row of rows) {
        await db
          .insert(sources)
          .values({
            key: row.key,
            tier: row.tier,
            enabled: row.enabled,
          })
          .onConflictDoNothing();
      }
    },

    async findAll(): Promise<SourceRow[]> {
      const rows = await db.select().from(sources);
      return rows.map((row) => ({
        key: row.key,
        tier: row.tier,
        enabled: row.enabled,
      }));
    },

    async setEnabled(key: SourceKey, enabled: boolean): Promise<SourceRow | null> {
      const updated = await db
        .update(sources)
        .set({ enabled })
        .where(eq(sources.key, key))
        .returning();

      const row = updated[0];
      if (!row) {
        return null;
      }

      return { key: row.key, tier: row.tier, enabled: row.enabled };
    },

    async findLastRunBySource(key: SourceKey): Promise<SourceLastRun | null> {
      const rows = await db
        .select({
          startedAt: ingestionRuns.startedAt,
          status: ingestionRuns.status,
        })
        .from(ingestionRuns)
        .where(arrayContains(ingestionRuns.sources, [key]))
        .orderBy(desc(ingestionRuns.startedAt))
        .limit(1);

      const row = rows[0];
      if (!row) {
        return null;
      }

      return { startedAt: row.startedAt, status: row.status };
    },
  };
}
