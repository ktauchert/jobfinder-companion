import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const allowed = new Set([path.normalize("components/ShortcutProvider.tsx")]);

function sourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...sourceFiles(full));
      continue;
    }
    if (full.endsWith(".ts") || full.endsWith(".tsx")) {
      files.push(full);
    }
  }
  return files;
}

describe("shortcut keydown listener", () => {
  it("lives only in the shortcut provider", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(srcRoot)) {
      if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) {
        continue;
      }
      const text = readFileSync(file, "utf8");
      if (
        !text.includes('addEventListener("keydown"') &&
        !text.includes("addEventListener('keydown'")
      ) {
        continue;
      }
      const relative = path.normalize(path.relative(srcRoot, file));
      if (!allowed.has(relative)) {
        offenders.push(relative);
      }
    }
    expect(offenders).toEqual([]);
  });
});
