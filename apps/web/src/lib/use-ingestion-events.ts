import { useContext } from "react";

import { IngestionEventsContext, type IngestionUiState } from "./ingestion-events-context.js";

export function useIngestionEvents(): IngestionUiState {
  return useContext(IngestionEventsContext);
}
