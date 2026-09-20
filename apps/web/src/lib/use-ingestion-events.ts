import type { IngestionEvent } from "@jobfinder/types";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useReducer } from "react";

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
  runStats: string | null;
}

const initialState: IngestionUiState = {
  activeRunId: null,
  sources: {},
  runStats: null,
};

type Action =
  | { type: "event"; event: IngestionEvent }
  | { type: "reset" };

function reducer(state: IngestionUiState, action: Action): IngestionUiState {
  switch (action.type) {
    case "reset":
      return initialState;
    case "event": {
      const event = action.event;
      if (event.type === "heartbeat") {
        return state;
      }
      if (event.type === "run.started") {
        return { activeRunId: event.runId, sources: {}, runStats: null };
      }
      if (event.type === "source.progress") {
        return {
          ...state,
          activeRunId: event.runId,
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
      if (event.type === "run.completed") {
        return {
          ...state,
          runStats: `${event.stats.embedded} embedded · ${event.stats.fetched} fetched`,
        };
      }
      if (event.type === "run.cancelled" || event.type === "run.failed") {
        return { ...state, activeRunId: null };
      }
      return state;
    }
    default:
      return state;
  }
}

export function useIngestionEvents() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const queryClient = useQueryClient();

  useEffect(() => {
    const source = new EventSource("/api/ingest/events");

    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data as string) as IngestionEvent;
        dispatch({ type: "event", event });
        if (event.type === "run.completed") {
          void queryClient.invalidateQueries({ queryKey: ["ingestion", "status"] });
          void queryClient.invalidateQueries({ queryKey: ["jobs"] });
        }
        if (event.type === "run.cancelled" || event.type === "run.failed") {
          void queryClient.invalidateQueries({ queryKey: ["ingestion", "status"] });
        }
      } catch {
        // ignore malformed events
      }
    };

    source.onerror = () => {
      source.close();
    };

    return () => {
      source.close();
      dispatch({ type: "reset" });
    };
  }, [queryClient]);

  return state;
}
