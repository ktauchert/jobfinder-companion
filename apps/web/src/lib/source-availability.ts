import type { SourceStatus } from "@jobfinder/types";

/** Tooltip for a source that cannot run. Null when it is configured and enabled. */
export function unconfiguredSourceTooltip(
  source: Pick<SourceStatus, "configured" | "enabled" | "requiredEnv">,
): string | null {
  if (!source.configured) {
    if (source.requiredEnv.length === 0) {
      return "Not configured";
    }
    return `Missing ${source.requiredEnv.join(", ")}`;
  }
  if (!source.enabled) {
    return "Not enabled";
  }
  return null;
}
