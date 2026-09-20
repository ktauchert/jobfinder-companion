import type { IngestionRun, IngestionRunStats } from "@jobfinder/types";
import type { IngestionRunRow } from "@jobfinder/database";

export function mapRunRow(row: IngestionRunRow): IngestionRun {
  return {
    id: row.id,
    status: row.status,
    sources: row.sources as IngestionRun["sources"],
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? null,
    stats: normalizeStats(row.stats),
    error: row.error,
  };
}

function normalizeStats(stats: IngestionRunStats): IngestionRunStats {
  return {
    fetched: stats.fetched ?? 0,
    inserted: stats.inserted ?? 0,
    updated: stats.updated ?? 0,
    extracted: stats.extracted ?? 0,
    embedded: stats.embedded ?? 0,
    failed: stats.failed ?? 0,
    pendingFetch: stats.pendingFetch ?? 0,
    pendingEnrich: stats.pendingEnrich ?? 0,
  };
}
