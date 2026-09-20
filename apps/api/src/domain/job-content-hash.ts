import { createHash } from "node:crypto";

/** Stable hash for skip-if-unchanged during fetch (ARCHITECTURE.md §7). */
export function computeJobContentHash(input: {
  title: string;
  company: string | null;
  descriptionText: string;
}): string {
  const payload = [input.title, input.company ?? "", input.descriptionText].join("|");
  return createHash("sha256").update(payload, "utf8").digest("hex");
}
