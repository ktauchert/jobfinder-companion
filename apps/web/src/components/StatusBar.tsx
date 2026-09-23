import { useState } from "react";

import { Button } from "@/components/ui/button.js";
import type { IngestionProgressView, PipelineRow } from "@/lib/ingestion-progress.js";
import { useIngestionEvents } from "@/lib/use-ingestion-events.js";

interface StatusBarProps {
  progress: IngestionProgressView;
  canStop: boolean;
  onStop: () => void;
}

export function StatusBar({ progress, canStop, onStop }: StatusBarProps) {
  const [expanded, setExpanded] = useState(false);
  const { dismissSourceFailure } = useIngestionEvents();
  const showDetails = expanded && progress.visible;

  return (
    <section
      aria-label="Ingestion status"
      tabIndex={0}
      className="min-h-10 border-b px-4 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onKeyDown={(event) => {
        if (event.key !== " " || event.target !== event.currentTarget) {
          return;
        }
        event.preventDefault();
        setExpanded((value) => !value);
      }}
    >
      {progress.visible ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-muted-foreground">
            {progress.active ? "Running · " : ""}
            {progress.collapsedSummary}
          </p>
          <Button size="sm" variant="outline" disabled={!canStop} onClick={onStop}>
            Stop
          </Button>
        </div>
      ) : (
        <p className="sr-only">Ingestion idle</p>
      )}

      {progress.sourceFailures.map((failure) => (
        <div
          key={failure.source}
          className="mt-1 flex items-center justify-between gap-3 text-destructive"
        >
          <span>
            {failure.source.toUpperCase()} failed: {failure.message}
          </span>
          <Button size="sm" variant="ghost" onClick={() => dismissSourceFailure(failure.source)}>
            Dismiss
          </Button>
        </div>
      ))}

      {showDetails ? (
        <div className="mt-2 space-y-1.5">
          {progress.rows.map((row) => (
            <PipelineRowView key={row.stage} row={row} />
          ))}
          {progress.fetchSources.map((line) => (
            <div key={line.source} className="font-mono text-xs text-muted-foreground">
              {line.source.toUpperCase()} · {line.stage} · {line.done}
              {line.total !== null ? `/${line.total}` : ""} · {line.message}
            </div>
          ))}
          {progress.lastMessage ? (
            <div className="text-xs text-muted-foreground">{progress.lastMessage}</div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function PipelineRowView({ row }: { row: PipelineRow }) {
  const ratio =
    row.total !== null && row.total > 0 ? Math.min(100, (row.done / row.total) * 100) : null;

  return (
    <div className="flex items-center gap-3 font-mono text-muted-foreground">
      <span className="w-16 capitalize">{row.label}</span>
      <div className="h-2 max-w-md flex-1 overflow-hidden rounded bg-muted">
        {ratio !== null ? (
          <div
            className={`h-full ${row.active ? "bg-primary" : "bg-primary/60"}`}
            style={{ width: `${ratio}%` }}
          />
        ) : null}
      </div>
      <span className="tabular-nums">
        {row.done}
        {row.total !== null ? `/${row.total}` : ""}
      </span>
    </div>
  );
}
