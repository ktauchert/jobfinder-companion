import { SHORTCUTS } from "@/lib/shortcuts";

export function Footer() {
  return (
    <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-2 text-sm text-muted-foreground">
      {SHORTCUTS.map((shortcut) => (
        <span key={shortcut.key} className="inline-flex items-center gap-1.5">
          <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">
            {shortcut.label}
          </kbd>
          <span>{shortcut.description}</span>
        </span>
      ))}
    </footer>
  );
}
