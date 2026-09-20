import type { IngestionUiState } from "@/lib/use-ingestion-events.js";

interface StatusBarProps {
  ingestion: IngestionUiState;
  isActive: boolean;
}

export function StatusBar({ ingestion, isActive }: StatusBarProps) {
  if (!isActive && Object.keys(ingestion.sources).length === 0 && !ingestion.runStats) {
    return null;
  }

  const lines = Object.values(ingestion.sources);

  return (
    <div className="border-b bg-muted/30 px-4 py-2 text-sm">
      {lines.map((line) => (
        <div key={line.source} className="font-mono text-muted-foreground">
          {line.source.toUpperCase()} · {line.stage} {line.done}
          {line.total !== null ? `/${line.total}` : ""} · {line.message}
        </div>
      ))}
      {ingestion.runStats ? (
        <div className="mt-1 text-muted-foreground">Run: {ingestion.runStats}</div>
      ) : null}
    </div>
  );
}
