import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchIngestionStatus,
  fetchSources,
  startIngestion,
  stopIngestion,
} from "./api.js";

export function useSources() {
  return useQuery({
    queryKey: ["sources"],
    queryFn: fetchSources,
  });
}

export function useIngestionStatus() {
  return useQuery({
    queryKey: ["ingestion", "status"],
    queryFn: fetchIngestionStatus,
    refetchInterval: (query) => (query.state.data?.active ? 5000 : false),
  });
}

export function useStartIngestion() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: startIngestion,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["ingestion", "status"] });
    },
  });
}

export function useStopIngestion() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: stopIngestion,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["ingestion", "status"] });
    },
  });
}
