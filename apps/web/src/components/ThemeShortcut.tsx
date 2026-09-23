import { useTheme } from "next-themes";

import { useShortcutHandler } from "@/lib/use-shortcuts.js";

/** Toggles light and dark. System is the initial theme until `t` is pressed. */
export function ThemeShortcut() {
  const { resolvedTheme, setTheme } = useTheme();

  useShortcutHandler("theme", () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  });

  return null;
}
