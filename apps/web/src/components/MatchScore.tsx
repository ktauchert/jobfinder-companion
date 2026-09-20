import { cn } from "@/lib/utils.js";

interface MatchScoreProps {
  score: number;
  className?: string;
}

export function MatchScore({ score, className }: MatchScoreProps) {
  return (
    <span
      className={cn(
        "inline-flex min-w-10 items-center justify-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
        score >= 80 && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
        score >= 60 && score < 80 && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
        score < 60 && "bg-muted text-muted-foreground",
        className,
      )}
    >
      {score}
    </span>
  );
}
