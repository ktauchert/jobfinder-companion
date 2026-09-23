/** Keyboard shortcut registry. Footer and the help overlay render from this. */

export const SHORTCUTS = [
  { id: "search", key: "/", label: "/", description: "Search", scope: "global" },
  { id: "refresh", key: "r", label: "r", description: "Refresh", scope: "global" },
  { id: "ingest", key: "i", label: "i", description: "Ingest", scope: "global" },
  { id: "stop", key: "s", label: "s", description: "Stop", scope: "global" },
  { id: "help", key: "?", label: "?", description: "Help", scope: "global" },
  { id: "close", key: "Escape", label: "Esc", description: "Close", scope: "global" },
  { id: "down", key: "j", label: "j", description: "Down", scope: "list" },
  { id: "up", key: "k", label: "k", description: "Up", scope: "list" },
  { id: "open", key: "Enter", label: "Enter", description: "Open", scope: "list" },
  { id: "hide", key: "h", label: "h", description: "Hide", scope: "list" },
] as const;

export type Shortcut = (typeof SHORTCUTS)[number];
export type ShortcutId = Shortcut["id"];
/** Scopes the footer can show. Entries use `global` and `list` until later issues add the rest. */
export type ShortcutScope = "global" | "list" | "tagbar" | "detail";

export interface ShortcutEvent {
  key: string;
  inTextField: boolean;
  activeScope: ShortcutScope;
  helpOpen: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

/** Which registry entry should run for this key, if any. */
export function resolveShortcut(event: ShortcutEvent): Shortcut | null {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return null;
  }

  const shortcut = SHORTCUTS.find((entry) => entry.key === event.key);
  if (!shortcut) {
    return null;
  }

  if (event.helpOpen && shortcut.id !== "close") {
    return null;
  }

  if (event.inTextField && shortcut.id !== "close") {
    return null;
  }

  if (shortcut.scope !== "global" && shortcut.scope !== event.activeScope) {
    return null;
  }

  return shortcut;
}

/** Footer shows global bindings plus the bindings for the scope in focus. */
export function shortcutsForFooter(activeScope: ShortcutScope): readonly Shortcut[] {
  return SHORTCUTS.filter(
    (shortcut) => shortcut.scope === "global" || shortcut.scope === activeScope,
  );
}
