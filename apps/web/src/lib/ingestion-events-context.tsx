import type { IngestionEvent } from "@jobfinder/types";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useEffect, useMemo, useReducer, type ReactNode } from "react";

import { subscribeIngestionEvents } from "./ingestion-sse-client.js";
import {
  dismissSourceFailure,
  initialIngestionUiState,
  reduceIngestionUi,
  type IngestionUiState,
  type SourceProgress,
} from "./ingestion-ui-state.js";

export type { IngestionUiState, SourceProgress };

type Action =
  { type: "event"; event: IngestionEvent } | { type: "dismiss-failure"; source: string };

function reducer(state: IngestionUiState, action: Action): IngestionUiState {
  if (action.type === "dismiss-failure") {
    return dismissSourceFailure(state, action.source);
  }
  return reduceIngestionUi(state, action.event);
}

interface IngestionEventsContextValue extends IngestionUiState {
  dismissSourceFailure: (source: string) => void;
}

export const IngestionEventsContext = createContext<IngestionEventsContextValue>({
  ...initialIngestionUiState,
  dismissSourceFailure: () => undefined,
});

export function IngestionEventsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialIngestionUiState);
  const queryClient = useQueryClient();
  const dismiss = useCallback((source: string) => {
    dispatch({ type: "dismiss-failure", source });
  }, []);

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

  const value = useMemo(() => ({ ...state, dismissSourceFailure: dismiss }), [dismiss, state]);

  return (
    <IngestionEventsContext.Provider value={value}>{children}</IngestionEventsContext.Provider>
  );
}
