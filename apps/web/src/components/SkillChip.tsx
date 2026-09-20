import type { SkillMatchState } from "@jobfinder/types";
import { CheckIcon, XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge.js";
import { cn } from "@/lib/utils.js";

interface SkillChipProps {
  label: string;
  state: SkillMatchState;
  className?: string;
}

export function SkillChip({ label, state, className }: SkillChipProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-normal",
        state === "must_have" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
        state === "excluded" && "border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-300",
        className,
      )}
    >
      {state === "must_have" ? <CheckIcon className="size-3" /> : null}
      {state === "excluded" ? <XIcon className="size-3" /> : null}
      {label}
    </Badge>
  );
}
