import type { SearchJobsResponse } from "@jobfinder/types";
import type { InfiniteData, QueryClient } from "@tanstack/react-query";

export type JobsInfiniteData = InfiniteData<SearchJobsResponse, string | undefined>;

export function removeJobFromJobsCache(queryClient: QueryClient, jobId: string): void {
  queryClient.setQueriesData<JobsInfiniteData>({ queryKey: ["jobs"] }, (current) => {
    if (!current) {
      return current;
    }

    return {
      ...current,
      pages: current.pages.map((page) => ({
        ...page,
        items: page.items.filter((match) => match.job.id !== jobId),
        total: Math.max(0, page.total - 1),
      })),
    };
  });
}

export function restoreJobToJobsCache(
  queryClient: QueryClient,
  snapshot: JobsInfiniteData | undefined,
): void {
  if (!snapshot) {
    return;
  }
  queryClient.setQueriesData<JobsInfiniteData>({ queryKey: ["jobs"] }, snapshot);
}

export function snapshotJobsCache(queryClient: QueryClient): JobsInfiniteData | undefined {
  return queryClient.getQueriesData<JobsInfiniteData>({ queryKey: ["jobs"] })[0]?.[1];
}
