import type { SourceStatus } from "@jobfinder/types";

import { Badge } from "@/components/ui/badge.js";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.js";
import { useSources } from "@/lib/queries.js";
import { unconfiguredSourceTooltip } from "@/lib/source-availability.js";
import { cn } from "@/lib/utils.js";

/** Always visible: the status bar hides itself while ingestion is idle. */
export function SourceStrip() {
  const { data } = useSources();
  const sources = data?.sources ?? [];
  if (sources.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
      <span className="text-xs text-muted-foreground">Sources</span>
      {sources.map((source) => (
        <SourceChip key={source.key} source={source} />
      ))}
    </div>
  );
}

function SourceChip({ source }: { source: SourceStatus }) {
  const tooltip = unconfiguredSourceTooltip(source);
  const chip = (
    <Badge
      variant="outline"
      data-configured={source.configured ? "true" : "false"}
      data-enabled={source.enabled ? "true" : "false"}
      className={cn(tooltip && "cursor-help opacity-40")}
    >
      {source.label}
    </Badge>
  );

  if (!tooltip) {
    return chip;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex rounded-4xl outline-none focus-visible:ring-2">
          {chip}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
