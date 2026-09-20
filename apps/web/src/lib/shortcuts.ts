/** Keyboard shortcut registry. Footer renders from this; handlers subscribe to it. */

export interface Shortcut {
  key: string;
  label: string;
  /** Shown in Footer; keep short. */
  description: string;
}

export const SHORTCUTS: readonly Shortcut[] = [
  { key: "/", label: "/", description: "Search" },
  { key: "r", label: "r", description: "Refresh" },
  { key: "i", label: "i", description: "Ingest" },
  { key: "j", label: "j", description: "Down" },
  { key: "k", label: "k", description: "Up" },
  { key: "Enter", label: "Enter", description: "Open" },
  { key: "h", label: "h", description: "Hide" },
] as const;
