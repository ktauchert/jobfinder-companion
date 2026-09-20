import type { SearchJobsQuery, UpdateProfileRequest } from "@jobfinder/types";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { toast } from "sonner";

import {
  fetchIngestionStatus,
  fetchJobs,
  fetchProfile,
  fetchSources,
  hideJob,
  searchSkills,
  startIngestion,
  stopIngestion,
  unhideJob,
  updateProfile,
} from "./api.js";
import {
  removeJobFromJobsCache,
  restoreJobToJobsCache,
  snapshotJobsCache,
  type JobsInfiniteData,
} from "./jobs-cache.js";

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

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });
}

export function useUpdateProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (data) => {
      client.setQueryData(["profile"], data);
      void client.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function useSkillsSearch(q: string, enabled: boolean) {
  return useQuery({
    queryKey: ["skills", q],
    queryFn: () => searchSkills(q),
    enabled: enabled && q.trim().length > 0,
    staleTime: 60_000,
  });
}

export function useJobsSearch(query: SearchJobsQuery) {
  return useInfiniteQuery({
    queryKey: ["jobs", query],
    queryFn: ({ pageParam }) => {
      const request: SearchJobsQuery = {
        ...query,
        limit: query.limit ?? 20,
      };
      if (pageParam) {
        request.cursor = pageParam;
      }
      return fetchJobs(request);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useHideJobWithUndo() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: hideJob,
    onMutate: async (jobId: string) => {
      await client.cancelQueries({ queryKey: ["jobs"] });
      const snapshot = snapshotJobsCache(client);
      removeJobFromJobsCache(client, jobId);
      return { snapshot };
    },
    onError: (_error, _jobId, context) => {
      restoreJobToJobsCache(client, context?.snapshot);
      toast.error("Failed to hide job");
    },
    onSuccess: (_data, jobId) => {
      toast("Job hidden", {
        duration: 5000,
        action: {
          label: "Undo",
          onClick: () => {
            void unhideJob(jobId).then(() => {
              void client.invalidateQueries({ queryKey: ["jobs"] });
            });
          },
        },
      });
    },
  });
}

export function useRefreshJobs() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: ["jobs"] });
}

export type { JobsInfiniteData, InfiniteData, UpdateProfileRequest };
