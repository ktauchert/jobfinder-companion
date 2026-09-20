import type { IngestionProgressView, PipelineRow } from "@/lib/ingestion-progress.js";

interface StatusBarProps {
  progress: IngestionProgressView;
}

export function StatusBar({ progress }: StatusBarProps) {
  if (!progress.visible) {
    return null;
  }

  return (
    <div className="space-y-1.5 border-b bg-muted/30 px-4 py-2 text-sm">
      <div className="font-medium text-muted-foreground">
        Ingestion {progress.active ? "· running" : "· finished"}
      </div>

      {progress.rows.map((row) => (
        <PipelineRowView key={row.stage} row={row} />
      ))}

      {progress.fetchSources.map((line) => (
        <div key={line.source} className="font-mono text-xs text-muted-foreground">
          {line.source.toUpperCase()} · {line.message}
        </div>
      ))}

      {progress.lastMessage ? (
        <div className="text-xs text-muted-foreground">{progress.lastMessage}</div>
      ) : null}

      {progress.active ? (
        <div className="text-xs text-muted-foreground">
          Pending enrich: {progress.pendingEnrich}
          {progress.failed > 0 ? ` · Failed: ${progress.failed}` : ""}
        </div>
      ) : null}

      {progress.summary ? (
        <div className="text-muted-foreground">Run: {progress.summary}</div>
      ) : null}
    </div>
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
