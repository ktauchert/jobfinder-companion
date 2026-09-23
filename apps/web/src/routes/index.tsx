import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { JobList } from "@/components/JobList.js";
import { TagBar } from "@/components/TagBar.js";
import { validateHomeSearch } from "@/lib/home-search.js";
import { openSelectedJob } from "@/lib/job-navigation.js";
import { useJobsSearch, useRefreshJobs } from "@/lib/queries.js";
import {
  useRegisterShortcutClose,
  useSetShortcutScope,
  useShortcutHandler,
} from "@/lib/use-shortcuts.js";

export const Route = createFileRoute("/")({
  validateSearch: validateHomeSearch,
  component: Home,
});

function Home() {
  const { q, selected, detail } = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hideHandlerRef = useRef<(() => void) | null>(null);
  const scrollToSelectionRef = useRef(false);
  const refreshJobs = useRefreshJobs();
  const setShortcutScope = useSetShortcutScope();

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

  const setDetailId = useCallback(
    (id: string | undefined) => {
      void navigate({
        search: (prev) => {
          const next = { ...prev };
          if (id) {
            next.detail = id;
          } else {
            delete next.detail;
          }
          return next;
        },
      });
    },
    [navigate],
  );

  useEffect(() => {
    setShortcutScope(detail ? "detail" : "list");
  }, [detail, setShortcutScope]);

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
    if (!selected) {
      return;
    }
    setDetailId(detail === selected ? undefined : selected);
  });
  useShortcutHandler("original", () => {
    openSelectedJob(matches, selected);
  });
  useShortcutHandler("hide", () => {
    hideHandlerRef.current?.();
  });
  useRegisterShortcutClose(() => {
    if (!detail) {
      return false;
    }
    setDetailId(undefined);
    document.querySelector<HTMLElement>(`[data-job-id="${CSS.escape(detail)}"]`)?.focus();
    return true;
  });

  return (
    <div className="flex flex-col">
      <TagBar q={q} searchInputRef={searchInputRef} />
      <JobList
        q={q}
        selectedId={selected}
        detailId={detail}
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
