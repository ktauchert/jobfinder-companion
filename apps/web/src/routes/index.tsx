import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useRef } from "react";

import { JobList } from "@/components/JobList.js";
import { useShortcutHandler } from "@/lib/use-shortcuts.js";
import { TagBar } from "@/components/TagBar.js";
import { validateHomeSearch } from "@/lib/home-search.js";
import { openSelectedJob } from "@/lib/job-navigation.js";
import { useJobsSearch, useRefreshJobs } from "@/lib/queries.js";

export const Route = createFileRoute("/")({
  validateSearch: validateHomeSearch,
  component: Home,
});

function Home() {
  const { q, selected } = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hideHandlerRef = useRef<(() => void) | null>(null);
  const scrollToSelectionRef = useRef(false);
  const refreshJobs = useRefreshJobs();

  const jobsQuery = useJobsSearch({ ...(q ? { q } : {}), limit: 20 });
  const matches = useMemo(
    () => jobsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [jobsQuery.data],
  );

  const setSelectedId = useCallback(
    (id: string | undefined) => {
      void navigate({
        search: (prev) => {
          const next = { ...prev };
          if (id) {
            next.selected = id;
          } else {
            delete next.selected;
          }
          return next;
        },
      });
    },
    [navigate],
  );

  const moveSelection = useCallback(
    (delta: number) => {
      if (matches.length === 0) {
        return;
      }
      const index = matches.findIndex((match) => match.job.id === selected);
      const start = index >= 0 ? index : 0;
      const next = Math.min(Math.max(start + delta, 0), matches.length - 1);
      const nextId = matches[next]?.job.id;
      if (nextId) {
        scrollToSelectionRef.current = true;
        setSelectedId(nextId);
      }
      if (delta > 0 && next === matches.length - 1 && jobsQuery.hasNextPage) {
        void jobsQuery.fetchNextPage();
      }
    },
    [jobsQuery, matches, selected, setSelectedId],
  );

  useShortcutHandler("search", () => {
    searchInputRef.current?.focus();
  });
  useShortcutHandler("refresh", () => {
    void refreshJobs();
  });
  useShortcutHandler("down", () => {
    moveSelection(1);
  });
  useShortcutHandler("up", () => {
    moveSelection(-1);
  });
  useShortcutHandler("open", () => {
    openSelectedJob(matches, selected);
  });
  useShortcutHandler("hide", () => {
    hideHandlerRef.current?.();
  });

  return (
    <div className="flex flex-col">
      <TagBar q={q} searchInputRef={searchInputRef} />
      <JobList
        q={q}
        selectedId={selected}
        onSelectedIdChange={setSelectedId}
        scrollToSelectionRef={scrollToSelectionRef}
        onHideJob={() => {
          const index = matches.findIndex((match) => match.job.id === selected);
          const next = matches[index + 1] ?? matches[index - 1];
          scrollToSelectionRef.current = true;
          setSelectedId(next?.job.id);
        }}
        registerHideHandler={(handler) => {
          hideHandlerRef.current = handler;
        }}
      />
    </div>
  );
}
