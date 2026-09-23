export type HomeSearch = {
  q?: string;
  selected?: string;
  /** Job id whose inline detail panel is open. */
  detail?: string;
};

export function validateHomeSearch(search: Record<string, unknown>): HomeSearch {
  return {
    ...(typeof search.q === "string" && search.q ? { q: search.q } : {}),
    ...(typeof search.selected === "string" && search.selected ? { selected: search.selected } : {}),
    ...(typeof search.detail === "string" && search.detail ? { detail: search.detail } : {}),
  };
}
