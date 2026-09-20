import { createDb, ingestionRuns, type Database } from "@jobfinder/database";
import type { IngestionRunStats, IngestionRunStatus } from "@jobfinder/types";
import { desc, eq, inArray } from "drizzle-orm";

import type { CreateRunInput, RunRepository } from "../../ports/run-repository.js";
import { mapRunRow } from "./map-run.js";

const ACTIVE_STATUSES = ["queued", "running"] as const;

export function createDrizzleRunRepository(databaseUrl: string): RunRepository {
  return createDrizzleRunRepositoryFromDb(createDb(databaseUrl));
}

export function createDrizzleRunRepositoryFromDb(db: Database): RunRepository {
  return {
    async createRun(input: CreateRunInput) {
      const rows = await db
        .insert(ingestionRuns)
        .values({
          status: "running",
          sources: input.sources,
          stats: {
            fetched: 0,
            inserted: 0,
            updated: 0,
            extracted: 0,
            embedded: 0,
            failed: 0,
            pendingFetch: input.pendingFetch,
            pendingEnrich: 0,
          },
        })
        .returning();

      const row = rows[0];
      if (!row) {
        throw new Error("Failed to create ingestion run");
      }
      return mapRunRow(row);
    },

    async findActiveRun() {
      const rows = await db
        .select()
        .from(ingestionRuns)
        .where(inArray(ingestionRuns.status, [...ACTIVE_STATUSES]))
        .orderBy(desc(ingestionRuns.startedAt))
        .limit(1);

      const row = rows[0];
      return row ? mapRunRow(row) : null;
    },

    async findRecentRuns(limit: number) {
      const rows = await db
        .select()
        .from(ingestionRuns)
        .orderBy(desc(ingestionRuns.startedAt))
        .limit(limit);
      return rows.map(mapRunRow);
    },

    async findById(runId: string) {
      const rows = await db
        .select()
        .from(ingestionRuns)
        .where(eq(ingestionRuns.id, runId))
        .limit(1);
      const row = rows[0];
      return row ? mapRunRow(row) : null;
    },

    async updateStatus(runId: string, status: IngestionRunStatus, error?: string | null) {
      await db
        .update(ingestionRuns)
        .set({
          status,
          error: error ?? null,
          finishedAt: ["completed", "failed", "cancelled"].includes(status)
            ? new Date()
            : undefined,
        })
        .where(eq(ingestionRuns.id, runId));
    },

    async incrementStats(runId: string, delta: Partial<IngestionRunStats>) {
      return patchStats(db, runId, delta);
    },

    async adjustPending(
      runId: string,
      delta: Partial<Pick<IngestionRunStats, "pendingFetch" | "pendingEnrich">>,
    ) {
      return patchStats(db, runId, delta);
    },

    async getStats(runId: string) {
      const rows = await db
        .select({ stats: ingestionRuns.stats })
        .from(ingestionRuns)
        .where(eq(ingestionRuns.id, runId))
        .limit(1);
      return rows[0]?.stats ?? null;
    },
  };
}

async function patchStats(
  db: Database,
  runId: string,
  delta: Partial<IngestionRunStats>,
): Promise<IngestionRunStats> {
  const current = await db
    .select({ stats: ingestionRuns.stats })
    .from(ingestionRuns)
    .where(eq(ingestionRuns.id, runId))
    .limit(1);

  const base = current[0]?.stats;
  if (!base) {
    throw new Error(`Run ${runId} not found`);
  }

  const next: IngestionRunStats = {
    fetched: base.fetched + (delta.fetched ?? 0),
    inserted: base.inserted + (delta.inserted ?? 0),
    updated: base.updated + (delta.updated ?? 0),
    extracted: base.extracted + (delta.extracted ?? 0),
    embedded: base.embedded + (delta.embedded ?? 0),
    failed: base.failed + (delta.failed ?? 0),
    pendingFetch: base.pendingFetch + (delta.pendingFetch ?? 0),
    pendingEnrich: base.pendingEnrich + (delta.pendingEnrich ?? 0),
  };

  await db.update(ingestionRuns).set({ stats: next }).where(eq(ingestionRuns.id, runId));
  return next;
}
