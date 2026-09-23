import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.js";
import {
  resolveShortcut,
  SHORTCUTS,
  type ShortcutId,
  type ShortcutScope,
} from "@/lib/shortcuts.js";
import { ShortcutContext } from "@/lib/use-shortcuts.js";

interface ShortcutProviderProps {
  children: ReactNode;
}

export function ShortcutProvider({ children }: ShortcutProviderProps) {
  const [activeScope, setActiveScope] = useState<ShortcutScope>("list");
  const [helpOpen, setHelpOpen] = useState(false);
  const handlersRef = useRef(new Map<ShortcutId, () => void>());

  const register = useCallback((id: ShortcutId, handler: () => void) => {
    handlersRef.current.set(id, handler);
    return () => {
      if (handlersRef.current.get(id) === handler) {
        handlersRef.current.delete(id);
      }
    };
  }, []);

  useEffect(() => {
    return register("help", () => setHelpOpen(true));
  }, [register]);

  useEffect(() => {
    return register("close", () => {
      setHelpOpen(false);
      const active = document.activeElement;
      if (active instanceof HTMLElement && active !== document.body) {
        active.blur();
      }
    });
  }, [register]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const inTextField =
        target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
      const shortcut = resolveShortcut({
        key: event.key,
        inTextField,
        activeScope,
        helpOpen,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
      });
      if (!shortcut) {
        return;
      }
      const handler = handlersRef.current.get(shortcut.id);
      if (!handler) {
        return;
      }
      event.preventDefault();
      handler();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeScope, helpOpen]);

  const value = useMemo(() => ({ activeScope, setActiveScope, register }), [activeScope, register]);

  return (
    <ShortcutContext.Provider value={value}>
      {children}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
            <DialogDescription>
              Modifier-free keys. Esc blurs a field or closes this help.
            </DialogDescription>
          </DialogHeader>
          <ul className="flex flex-col gap-1.5">
            {SHORTCUTS.map((shortcut) => (
              <li key={shortcut.id} className="flex items-center justify-between gap-4">
                <span>{shortcut.description}</span>
                <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">
                  {shortcut.label}
                </kbd>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </ShortcutContext.Provider>
  );
}
