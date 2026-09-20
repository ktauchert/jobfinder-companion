import type { JobMatch } from "@jobfinder/types";

export function openSelectedJob(matches: JobMatch[], selectedId: string | undefined) {
  const match = matches.find((entry) => entry.job.id === selectedId);
  if (match?.job.url) {
    window.open(match.job.url, "_blank", "noopener,noreferrer");
  }
}
