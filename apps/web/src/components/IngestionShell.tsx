import { useEffect, type ReactNode } from "react";

import { SourceStrip } from "@/components/SourceStrip.js";
import { StatusBar } from "@/components/StatusBar.js";
import { useIngestionStatus, useStartIngestion } from "@/lib/queries.js";
import { useIngestionProgress } from "@/lib/use-ingestion-progress.js";

interface IngestionShellProps {
  children: ReactNode;
}

export function IngestionShell({ children }: IngestionShellProps) {
  const progress = useIngestionProgress();
  const { data: status } = useIngestionStatus();
  const start = useStartIngestion();
  const isActive = Boolean(status?.active);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (event.key === "i" && !isActive && !start.isPending) {
        event.preventDefault();
        start.mutate({});
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isActive, start]);

  return (
    <>
      <SourceStrip />
      <StatusBar progress={progress} />
      {children}
    </>
  );
}
