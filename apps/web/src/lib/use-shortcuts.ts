import { createContext, useContext, useEffect, useRef, type FocusEvent } from "react";

import type { ShortcutId, ShortcutScope } from "@/lib/shortcuts.js";

export interface ShortcutContextValue {
  activeScope: ShortcutScope;
  setActiveScope: (scope: ShortcutScope) => void;
  register: (id: ShortcutId, handler: () => void) => () => void;
  /** Return true when the handler consumed Esc. */
  registerClose: (handler: () => boolean) => () => void;
}

export const ShortcutContext = createContext<ShortcutContextValue | null>(null);

function useShortcutContext(): ShortcutContextValue {
  const value = useContext(ShortcutContext);
  if (!value) {
    throw new Error("Shortcut hooks must render inside ShortcutProvider");
  }
  return value;
}

export function useShortcutHandler(id: ShortcutId, handler: () => void) {
  const { register } = useShortcutContext();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => register(id, () => handlerRef.current()), [id, register]);
}

/** Marks a region as the active shortcut scope while focus is inside it. */
export function useShortcutScope(scope: ShortcutScope) {
  const { setActiveScope } = useShortcutContext();

  return {
    onFocusCapture: () => setActiveScope(scope),
    onBlurCapture: (event: FocusEvent<HTMLElement>) => {
      const next = event.relatedTarget;
      if (next instanceof Node && event.currentTarget.contains(next)) {
        return;
      }
      setActiveScope("list");
    },
  };
}

export function useActiveShortcutScope(): ShortcutScope {
  return useShortcutContext().activeScope;
}

export function useSetShortcutScope(): (scope: ShortcutScope) => void {
  return useShortcutContext().setActiveScope;
}

export function useRegisterShortcutClose(handler: () => boolean) {
  const { registerClose } = useShortcutContext();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => registerClose(() => handlerRef.current()), [registerClose]);
}
