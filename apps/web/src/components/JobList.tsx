import { useEffect, useMemo, useRef, type RefObject } from "react";

import { JobCard } from "@/components/JobCard.js";
import { JobDetail } from "@/components/JobDetail.js";
import { Button } from "@/components/ui/button.js";
import { emptyListReason, filteredEmptyMessage } from "@/lib/empty-list-reason.js";
import { useHideJobWithUndo, useJobsSearch, useProfile } from "@/lib/queries.js";

interface JobListProps {
  q: string | undefined;
  selectedId: string | undefined;
  detailId: string | undefined;
  /** Dev-only state preview: empty, filtered, or error. */
  preview?: string | undefined;
  onSelectedIdChange: (id: string | undefined) => void;
  onHideJob: () => void;
  registerHideHandler: (handler: (() => void) | null) => void;
  /** When true, the next selectedId change scrolls the card into view (j/k, hide). */
  scrollToSelectionRef: RefObject<boolean>;
}

export function JobList({
  q,
  selectedId,
  detailId,
  preview,
  onSelectedIdChange,
  onHideJob,
  registerHideHandler,
  scrollToSelectionRef,
}: JobListProps) {
  const jobsQuery = useJobsSearch({ ...(q ? { q } : {}), limit: 20 });
  const profileQuery = useProfile();
  const hideJob = useHideJobWithUndo();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<string, HTMLElement>());

  const matches = useMemo(
    () => jobsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [jobsQuery.data],
  );

  const selectedIndex = matches.findIndex((match) => match.job.id === selectedId);

  useEffect(() => {
    if (matches.length === 0) {
      onSelectedIdChange(undefined);
      return;
    }
    if (!selectedId || !matches.some((match) => match.job.id === selectedId)) {
      onSelectedIdChange(matches[0]?.job.id);
    }
  }, [matches, onSelectedIdChange, selectedId]);

  useEffect(() => {
    if (!selectedId || !scrollToSelectionRef.current) {
      return;
    }
    scrollToSelectionRef.current = false;
    cardRefs.current.get(selectedId)?.scrollIntoView({ block: "nearest" });
  }, [scrollToSelectionRef, selectedId]);

  useEffect(() => {
    registerHideHandler(() => {
      if (!selectedId) {
        return;
      }
      hideJob.mutate(selectedId, {
        onSuccess: () => {
          onHideJob();
        },
      });
    });
    return () => registerHideHandler(null);
  }, [hideJob, onHideJob, registerHideHandler, selectedId]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !jobsQuery.hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && jobsQuery.hasNextPage && !jobsQuery.isFetchingNextPage) {
        void jobsQuery.fetchNextPage();
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [jobsQuery]);

  const profile = profileQuery.data?.profile;
  const filters = {
    q,
    mustHaveSkills: profile?.mustHaveSkills ?? [],
    excludeSkills: profile?.excludeSkills ?? [],
  };
  const showError = preview === "error" || jobsQuery.isError;
  const showEmpty = preview === "empty" || preview === "filtered" || matches.length === 0;
  const reason =
    preview === "filtered" ? "filtered" : preview === "empty" ? "corpus" : emptyListReason(filters);

  if (jobsQuery.isLoading && matches.length === 0 && preview == null) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">Loading jobs…</p>;
  }

  if (showEmpty && !showError) {
    return (
      <div className="flex flex-col items-start gap-3 px-4 py-8">
        {reason === "corpus" ? (
          <p className="text-sm text-muted-foreground">
            No jobs yet. Press <kbd className="rounded border px-1">i</kbd> to ingest.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">{filteredEmptyMessage(filters)}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      {showError ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive"
        >
          <span>The API is unreachable.</span>
          <Button size="sm" variant="outline" onClick={() => void jobsQuery.refetch()}>
            Retry
          </Button>
        </div>
      ) : null}
      {matches.map((match, index) => (
        <div key={match.job.id} className="flex flex-col gap-2">
          <JobCard
            ref={(node) => {
              if (node) {
                cardRefs.current.set(match.job.id, node);
              } else {
                cardRefs.current.delete(match.job.id);
              }
            }}
            match={match}
            focused={index === selectedIndex}
            onFocus={() => onSelectedIdChange(match.job.id)}
          />
          {detailId === match.job.id ? <JobDetail jobId={match.job.id} /> : null}
        </div>
      ))}
      <div ref={loadMoreRef} className="h-4" />
      {jobsQuery.hasNextPage ? (
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          disabled={jobsQuery.isFetchingNextPage}
          onClick={() => void jobsQuery.fetchNextPage()}
        >
          {jobsQuery.isFetchingNextPage ? "Loading…" : "Load more"}
        </Button>
      ) : null}
    </div>
  );
}
