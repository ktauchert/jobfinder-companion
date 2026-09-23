import { useContext } from "react";

import { IngestionEventsContext } from "./ingestion-events-context.js";

export function useIngestionEvents() {
  return useContext(IngestionEventsContext);
}
