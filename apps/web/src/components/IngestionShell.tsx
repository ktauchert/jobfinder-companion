import { useEffect, type ReactNode } from "react";

import { StatusBar } from "@/components/StatusBar.js";
import { useIngestionStatus, useStartIngestion } from "@/lib/queries.js";
import { useIngestionEvents } from "@/lib/use-ingestion-events.js";

interface IngestionShellProps {
  children: ReactNode;
}

export function IngestionShell({ children }: IngestionShellProps) {
  const ingestion = useIngestionEvents();
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
        start.mutate({ query: "softwareentwickler", location: "Berlin" });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isActive, start]);

  return (
    <>
      <StatusBar ingestion={ingestion} isActive={isActive} />
      {children}
    </>
  );
}
