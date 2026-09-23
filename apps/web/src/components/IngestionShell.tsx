import type { ReactNode } from "react";

import { useShortcutHandler } from "@/lib/use-shortcuts.js";
import { SourceStrip } from "@/components/SourceStrip.js";
import { StatusBar } from "@/components/StatusBar.js";
import { useIngestionStatus, useStartIngestion, useStopIngestion } from "@/lib/queries.js";
import { useIngestionProgress } from "@/lib/use-ingestion-progress.js";

interface IngestionShellProps {
  children: ReactNode;
}

export function IngestionShell({ children }: IngestionShellProps) {
  const progress = useIngestionProgress();
  const { data: status } = useIngestionStatus();
  const start = useStartIngestion();
  const stop = useStopIngestion();
  const isActive = Boolean(status?.active);

  useShortcutHandler("ingest", () => {
    if (!isActive && !start.isPending) {
      start.mutate({});
    }
  });
  useShortcutHandler("stop", () => {
    if (isActive && !stop.isPending) {
      stop.mutate();
    }
  });

  return (
    <>
      <SourceStrip />
      <StatusBar
        progress={progress}
        canStop={isActive && !stop.isPending}
        onStop={() => stop.mutate()}
      />
      {children}
    </>
  );
}
