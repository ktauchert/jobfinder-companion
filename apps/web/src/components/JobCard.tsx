import type { JobMatch } from "@jobfinder/types";
import { forwardRef } from "react";

import { MatchScore } from "@/components/MatchScore.js";
import { SkillChip } from "@/components/SkillChip.js";
import { cn } from "@/lib/utils.js";

interface JobCardProps {
  match: JobMatch;
  focused?: boolean;
  onFocus?: () => void;
}

function formatSalary(match: JobMatch): string | null {
  const salary = match.job.salary;
  if (!salary?.min && !salary?.max) {
    return null;
  }
  const currency = salary.currency ?? "";
  if (salary.min && salary.max) {
    return `${salary.min.toLocaleString()}–${salary.max.toLocaleString()} ${currency}`.trim();
  }
  return `${(salary.max ?? salary.min)?.toLocaleString()} ${currency}`.trim();
}

export const JobCard = forwardRef<HTMLElement, JobCardProps>(function JobCard(
  { match, focused = false, onFocus },
  ref,
) {
  const { job } = match;
  const location = [job.location, job.remoteType !== "unknown" ? job.remoteType : null]
    .filter(Boolean)
    .join(" · ");
  const salary = formatSalary(match);
  const hidden = job.hiddenAt != null;

  return (
    <article
      ref={ref}
      tabIndex={0}
      onFocus={onFocus}
      onClick={onFocus}
      className={cn(
        "rounded-lg border bg-card p-4 outline-none transition-colors",
        focused && "border-primary ring-2 ring-primary/30",
        hidden && "opacity-50",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium">{job.title}</h3>
          <p className="truncate text-sm text-muted-foreground">
            {[job.company, location].filter(Boolean).join(" · ")}
          </p>
          {salary ? <p className="mt-1 text-sm text-muted-foreground">{salary}</p> : null}
        </div>
        <MatchScore score={match.matchScore} />
      </div>
      {match.skillMatches.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {match.skillMatches.map(({ skill, state }) => (
            <li key={skill.id}>
              <SkillChip label={skill.label} state={state} />
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
});
