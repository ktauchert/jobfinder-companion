import type { SourceKey } from "@jobfinder/types";

import type { SourceAdapter } from "./source-adapter.js";

export interface SourceAdapterRegistry {
  get(source: SourceKey): SourceAdapter | null;
}
