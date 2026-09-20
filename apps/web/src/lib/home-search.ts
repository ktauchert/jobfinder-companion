export type HomeSearch = {
  q?: string;
  selected?: string;
};

export function validateHomeSearch(search: Record<string, unknown>): HomeSearch {
  return {
    ...(typeof search.q === "string" && search.q ? { q: search.q } : {}),
    ...(typeof search.selected === "string" && search.selected
      ? { selected: search.selected }
      : {}),
  };
}
