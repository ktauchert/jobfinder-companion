export type HomeSearch = {
  q?: string;
  selected?: string;
  /** Job id whose inline detail panel is open. */
  detail?: string;
  /** Dev-only preview of empty, error, and disconnect screens. */
  states?: string;
};

export function validateHomeSearch(search: Record<string, unknown>): HomeSearch {
  return {
    ...(typeof search.q === "string" && search.q ? { q: search.q } : {}),
    ...(typeof search.selected === "string" && search.selected ? { selected: search.selected } : {}),
    ...(typeof search.detail === "string" && search.detail ? { detail: search.detail } : {}),
    ...(import.meta.env.DEV && typeof search.states === "string" && search.states
      ? { states: search.states }
      : {}),
  };
}
