import type { IngestionEvent, IngestionRunStats } from "@jobfinder/types";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useEffect, useMemo, useReducer, type ReactNode } from "react";

import { subscribeIngestionEvents } from "./ingestion-sse-client.js";

export interface SourceProgress {
  source: string;
  stage: string;
  done: number;
  total: number | null;
  message: string;
}

export interface IngestionUiState {
  activeRunId: string | null;
  sources: Record<string, SourceProgress>;
  runStats: IngestionRunStats | null;
  lastMessage: string | null;
  summary: string | null;
}

const initialState: IngestionUiState = {
  activeRunId: null,
  sources: {},
  runStats: null,
  lastMessage: null,
  summary: null,
};

type Action = { type: "event"; event: IngestionEvent };

function reducer(state: IngestionUiState, action: Action): IngestionUiState {
  const event = action.event;
  if (event.type === "heartbeat") {
    return state;
  }
  if (event.type === "run.started") {
    return {
      activeRunId: event.runId,
      sources: {},
      runStats: null,
      lastMessage: "Run started",
      summary: null,
    };
  }
  if (event.type === "source.progress") {
    return {
      ...state,
      activeRunId: event.runId,
      lastMessage: event.message,
      sources: {
        ...state.sources,
        [event.source]: {
          source: event.source,
          stage: event.stage,
          done: event.done,
          total: event.total,
          message: event.message,
        },
      },
    };
  }
  if (event.type === "run.progress") {
    return {
      ...state,
      activeRunId: event.runId,
      runStats: event.stats,
      lastMessage: event.message,
    };
  }
  if (event.type === "run.completed") {
    return {
      ...state,
      runStats: event.stats,
      summary: `${event.stats.embedded} embedded · ${event.stats.extracted} extracted · ${event.stats.fetched} fetched`,
      lastMessage: "Run completed",
    };
  }
  if (event.type === "run.cancelled") {
    return {
      ...state,
      activeRunId: null,
      lastMessage: "Run cancelled",
    };
  }
  if (event.type === "run.failed") {
    return {
      ...state,
      activeRunId: null,
      lastMessage: event.error,
    };
  }
  return state;
}

export const IngestionEventsContext = createContext<IngestionUiState>(initialState);

export function IngestionEventsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const queryClient = useQueryClient();

  useEffect(() => {
    let lastEmbedded = -1;

    return subscribeIngestionEvents((event) => {
      dispatch({ type: "event", event });
      if (event.type === "run.started") {
        void queryClient.invalidateQueries({ queryKey: ["jobs"] });
      }
      if (event.type === "run.progress" && event.stats.embedded > lastEmbedded) {
        lastEmbedded = event.stats.embedded;
        void queryClient.invalidateQueries({ queryKey: ["jobs"] });
      }
      if (event.type === "run.completed") {
        void queryClient.invalidateQueries({ queryKey: ["ingestion", "status"] });
        void queryClient.invalidateQueries({ queryKey: ["jobs"] });
      }
      if (event.type === "run.cancelled" || event.type === "run.failed") {
        void queryClient.invalidateQueries({ queryKey: ["ingestion", "status"] });
      }
    });
  }, [queryClient]);

  const value = useMemo(() => state, [state]);

  return (
    <IngestionEventsContext.Provider value={value}>{children}</IngestionEventsContext.Provider>
  );
}
