import { Button } from "@/components/ui/button.js";
import {
  useIngestionStatus,
  useStartIngestion,
  useStopIngestion,
} from "@/lib/queries.js";

export function Header() {
  const { data: status } = useIngestionStatus();
  const start = useStartIngestion();
  const stop = useStopIngestion();

  const isActive = Boolean(status?.active);

  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <h1 className="text-lg font-semibold tracking-tight">JobFinder</h1>
      <div className="flex items-center gap-3">
        <p className="text-sm text-muted-foreground">
          Ingestion: {isActive ? "Running…" : "Idle"}
        </p>
        <Button
          size="sm"
          disabled={isActive || start.isPending}
          onClick={() => start.mutate({ query: "softwareentwickler", location: "Berlin" })}
        >
          Run
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!isActive || stop.isPending}
          onClick={() => stop.mutate()}
        >
          Stop
        </Button>
      </div>
    </header>
  );
}
