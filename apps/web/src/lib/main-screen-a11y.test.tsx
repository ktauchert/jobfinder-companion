/** @vitest-environment jsdom */
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import axe from "axe-core";
import { describe, expect, it, afterEach } from "vitest";

import { Footer } from "@/components/Footer.js";
import { ShortcutProvider } from "@/components/ShortcutProvider.js";

describe("main screen accessibility", () => {
  let root: Root | undefined;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    document.body.innerHTML = "";
    document.documentElement.classList.remove("dark");
  });

  function renderScreen() {
    const container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(
        <ShortcutProvider>
          <header>
            <h1>JobFinder</h1>
          </header>
          <main>
            <section aria-label="Ingestion status" aria-live="polite">
              Ingestion idle
            </section>
            <section aria-label="Search profile">
              <button type="button">Remove typescript</button>
            </section>
          </main>
          <Footer />
        </ShortcutProvider>,
      );
    });
  }

  it("has no axe violations in light or dark", async () => {
    renderScreen();
    expect((await axe.run(document.body)).violations).toEqual([]);

    document.documentElement.classList.add("dark");
    expect((await axe.run(document.body)).violations).toEqual([]);
  });

  it("exposes shortcut keys on the footer", () => {
    renderScreen();
    const keys = [...document.querySelectorAll("kbd")].map((node) =>
      node.getAttribute("aria-keyshortcuts"),
    );
    expect(keys).toContain("/");
    expect(keys).toContain("t");
  });
});
