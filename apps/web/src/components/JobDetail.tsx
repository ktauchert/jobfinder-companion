import { plainParagraphs } from "@/lib/job-detail-text.js";
import { useJob } from "@/lib/queries.js";

interface JobDetailProps {
  jobId: string;
}

export function JobDetail({ jobId }: JobDetailProps) {
  const query = useJob(jobId);
  const description =
    query.data?.match.job.descriptionText ?? query.data?.match.job.descriptionRaw ?? "";
  const paragraphs = plainParagraphs(description);

  return (
    <section aria-label="Job detail" className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
      {query.isLoading ? <p className="text-muted-foreground">Loading detail…</p> : null}
      {query.isError ? <p className="text-destructive">Could not load this job.</p> : null}
      {paragraphs.map((paragraph, index) => (
        <p key={`${index}-${paragraph}`} className="mb-3 whitespace-pre-wrap last:mb-0">
          {paragraph}
        </p>
      ))}
      {query.data && paragraphs.length === 0 ? (
        <p className="text-muted-foreground">No description.</p>
      ) : null}
    </section>
  );
}
