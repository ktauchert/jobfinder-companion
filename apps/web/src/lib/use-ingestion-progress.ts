import { useMemo } from "react";

import {
  buildIngestionProgress,
  mergeRunStats,
  type IngestionProgressView,
} from "./ingestion-progress.js";
import { useIngestionEvents } from "./use-ingestion-events.js";
import { useIngestionStatus } from "./queries.js";

export function useIngestionProgress(): IngestionProgressView {
  const events = useIngestionEvents();
  const { data: status } = useIngestionStatus();

  return useMemo(() => {
    const active = Boolean(status?.active);
    const stats = mergeRunStats(status?.active?.stats, events.runStats);

    return buildIngestionProgress({
      active,
      stats,
      sources: events.sources,
      lastMessage: events.lastMessage,
      summary: events.summary,
    });
  }, [events, status]);
}
