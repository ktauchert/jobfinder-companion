import type { IngestionRunStats } from "@jobfinder/types";

import type { SourceProgress } from "./ingestion-events-context.js";

export interface PipelineRow {
  stage: "fetch" | "extract" | "embed";
  done: number;
  total: number | null;
  label: string;
  active: boolean;
}

export interface IngestionProgressView {
  visible: boolean;
  active: boolean;
  rows: PipelineRow[];
  fetchSources: SourceProgress[];
  lastMessage: string | null;
  failed: number;
  pendingEnrich: number;
  summary: string | null;
}

export function mergeRunStats(
  polled: IngestionRunStats | null | undefined,
  fromEvents: IngestionRunStats | null | undefined,
): IngestionRunStats | null {
  if (!polled && !fromEvents) {
    return null;
  }
  if (!polled) {
    return fromEvents ?? null;
  }
  if (!fromEvents) {
    return polled;
  }

  return {
    fetched: Math.max(polled.fetched, fromEvents.fetched),
    inserted: Math.max(polled.inserted, fromEvents.inserted),
    updated: Math.max(polled.updated, fromEvents.updated),
    extracted: Math.max(polled.extracted, fromEvents.extracted),
    embedded: Math.max(polled.embedded, fromEvents.embedded),
    failed: Math.max(polled.failed, fromEvents.failed),
    pendingFetch: Math.max(polled.pendingFetch, fromEvents.pendingFetch),
    pendingEnrich: Math.max(polled.pendingEnrich, fromEvents.pendingEnrich),
  };
}

export function enrichTotal(stats: IngestionRunStats): number {
  return Math.max(
    stats.inserted + stats.updated,
    stats.extracted,
    stats.embedded + stats.pendingEnrich,
    stats.fetched,
  );
}

export function fetchTotal(stats: IngestionRunStats, sources: SourceProgress[]): number | null {
  const totals = sources
    .map((source) => source.total)
    .filter((total): total is number => total !== null);
  if (totals.length > 0) {
    return Math.max(...totals);
  }
  if (stats.pendingFetch === 0 && stats.fetched > 0) {
    return stats.fetched;
  }
  return null;
}

export function buildIngestionProgress(input: {
  active: boolean;
  stats: IngestionRunStats | null;
  sources: Record<string, SourceProgress>;
  lastMessage: string | null;
  summary: string | null;
}): IngestionProgressView {
  const fetchSources = Object.values(input.sources);
  const stats = input.stats;

  if (!stats && fetchSources.length === 0 && !input.summary) {
    return {
      visible: false,
      active: false,
      rows: [],
      fetchSources: [],
      lastMessage: null,
      failed: 0,
      pendingEnrich: 0,
      summary: null,
    };
  }

  const safeStats: IngestionRunStats = stats ?? {
    fetched: 0,
    inserted: 0,
    updated: 0,
    extracted: 0,
    embedded: 0,
    failed: 0,
    pendingFetch: 0,
    pendingEnrich: 0,
  };

  const fetchDone = Math.max(safeStats.fetched, ...fetchSources.map((s) => s.done), 0);
  const fetchCap = fetchTotal(safeStats, fetchSources);
  const enrichCap = enrichTotal(safeStats);
  const fetchComplete = safeStats.pendingFetch === 0 && fetchDone > 0;

  const rows: PipelineRow[] = [
    {
      stage: "fetch",
      done: fetchDone,
      total: fetchCap,
      label: "Fetch",
      active: safeStats.pendingFetch > 0,
    },
    {
      stage: "extract",
      done: safeStats.extracted,
      total: enrichCap,
      label: "Extract",
      active: fetchComplete && safeStats.extracted < enrichCap,
    },
    {
      stage: "embed",
      done: safeStats.embedded,
      total: enrichCap,
      label: "Embed",
      active: fetchComplete && safeStats.embedded < enrichCap,
    },
  ];

  return {
    visible: input.active || fetchSources.length > 0 || Boolean(input.summary),
    active: input.active,
    rows,
    fetchSources,
    lastMessage: input.lastMessage,
    failed: safeStats.failed,
    pendingEnrich: safeStats.pendingEnrich,
    summary: input.summary,
  };
}
