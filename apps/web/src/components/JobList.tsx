import { useEffect, useMemo, useRef } from "react";

import { JobCard } from "@/components/JobCard.js";
import { Button } from "@/components/ui/button.js";
import { useHideJobWithUndo, useJobsSearch } from "@/lib/queries.js";

interface JobListProps {
  q: string | undefined;
  selectedId: string | undefined;
  onSelectedIdChange: (id: string | undefined) => void;
  onHideJob: () => void;
  registerHideHandler: (handler: (() => void) | null) => void;
}

export function JobList({
  q,
  selectedId,
  onSelectedIdChange,
  onHideJob,
  registerHideHandler,
}: JobListProps) {
  const jobsQuery = useJobsSearch({ ...(q ? { q } : {}), limit: 20 });
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
    if (!selectedId) {
      return;
    }
    cardRefs.current.get(selectedId)?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

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

  if (jobsQuery.isLoading) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">Loading jobs…</p>;
  }

  if (jobsQuery.isError) {
    return <p className="px-4 py-6 text-sm text-destructive">Failed to load jobs.</p>;
  }

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 px-4 py-8">
        <p className="text-sm text-muted-foreground">
          No matching jobs yet. Press <kbd className="rounded border px-1">i</kbd> or use Run in the
          header to ingest jobs.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      {matches.map((match, index) => (
        <JobCard
          key={match.job.id}
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
