export interface ListFilters {
  q: string | undefined;
  mustHaveSkills: string[];
  excludeSkills: string[];
}

/** Why the job list is empty: nothing ingested yet, or the active filters removed every row. */
export function emptyListReason(filters: ListFilters): "corpus" | "filtered" {
  const hasQuery = Boolean(filters.q?.trim());
  const hasSkills = filters.mustHaveSkills.length > 0 || filters.excludeSkills.length > 0;
  return hasQuery || hasSkills ? "filtered" : "corpus";
}

export function filteredEmptyMessage(filters: ListFilters): string {
  const parts: string[] = [];
  if (filters.q?.trim()) {
    parts.push(`search “${filters.q.trim()}”`);
  }
  if (filters.mustHaveSkills.length > 0) {
    parts.push(`require ${filters.mustHaveSkills.join(", ")}`);
  }
  if (filters.excludeSkills.length > 0) {
    parts.push(`exclude ${filters.excludeSkills.join(", ")}`);
  }
  if (parts.length === 0) {
    return "No jobs match the current filters.";
  }
  return `No jobs match ${parts.join(" · ")}.`;
}
