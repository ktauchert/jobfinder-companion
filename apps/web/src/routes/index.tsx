import { createFileRoute } from "@tanstack/react-router";

import { useSources } from "@/lib/queries.js";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { data } = useSources();

  return (
    <div className="flex flex-col gap-4 p-4">
      <p className="text-sm text-muted-foreground">
        Tag bar and job list will live here. Press <kbd className="rounded border px-1">i</kbd> or
        use Run in the header to ingest jobs.
      </p>
      {data ? (
        <ul className="text-sm">
          {data.sources.map((source) => (
            <li
              key={source.key}
              className={source.configured ? "" : "text-muted-foreground line-through"}
            >
              {source.label} ({source.tier}){!source.configured ? " — not configured" : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
