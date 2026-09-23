import { describe, expect, it } from "vitest";

import { resolveShortcut, shortcutsForFooter } from "./shortcuts.js";

describe("resolveShortcut", () => {
  it("moves the list with j when the list scope is active", () => {
    expect(
      resolveShortcut({ key: "j", inTextField: false, activeScope: "list", helpOpen: false })?.id,
    ).toBe("down");
  });

  it("ignores list keys while the tag bar scope is active", () => {
    expect(
      resolveShortcut({ key: "j", inTextField: false, activeScope: "tagbar", helpOpen: false }),
    ).toBeNull();
  });

  it("ignores shortcuts while typing except Esc", () => {
    expect(
      resolveShortcut({ key: "j", inTextField: true, activeScope: "list", helpOpen: false }),
    ).toBeNull();
    expect(
      resolveShortcut({ key: "Escape", inTextField: true, activeScope: "list", helpOpen: false })
        ?.id,
    ).toBe("close");
  });

  it("opens help with ? and ignores other keys while help is open", () => {
    expect(
      resolveShortcut({ key: "?", inTextField: false, activeScope: "list", helpOpen: false })?.id,
    ).toBe("help");
    expect(
      resolveShortcut({ key: "r", inTextField: false, activeScope: "list", helpOpen: true }),
    ).toBeNull();
    expect(
      resolveShortcut({ key: "Escape", inTextField: false, activeScope: "list", helpOpen: true })
        ?.id,
    ).toBe("close");
  });

  it("keeps global ingest available in the list scope", () => {
    expect(
      resolveShortcut({ key: "i", inTextField: false, activeScope: "list", helpOpen: false })?.id,
    ).toBe("ingest");
  });
});

describe("shortcutsForFooter", () => {
  it("shows global shortcuts plus the active scope", () => {
    const listKeys = shortcutsForFooter("list").map((shortcut) => shortcut.key);
    const tagbarKeys = shortcutsForFooter("tagbar").map((shortcut) => shortcut.key);

    expect(listKeys).toEqual(expect.arrayContaining(["/", "j", "k", "Enter", "h"]));
    expect(tagbarKeys).not.toContain("j");
    expect(tagbarKeys).toContain("/");
  });
});
