import type { SourceKey } from "@jobfinder/types";

import type { SourceDefinition } from "@jobfinder/types";

import type { SourceAdapter } from "../../ports/source-adapter.js";
import type { SourceAdapterRegistry } from "../../ports/source-adapters.js";
import { createBaAdapter } from "./ba/adapter.js";
import { createBaClient } from "./ba/client.js";

export function createSourceAdapterRegistry(options: {
  baClientId: string;
  baDefinition: SourceDefinition;
}): SourceAdapterRegistry {
  const ba = createBaAdapter(
    createBaClient({ apiKey: options.baClientId }),
    options.baDefinition,
  );

  const byKey = new Map<SourceKey, SourceAdapter>([["ba", ba]]);

  return {
    get(source: SourceKey) {
      return byKey.get(source) ?? null;
    },
  };
}
