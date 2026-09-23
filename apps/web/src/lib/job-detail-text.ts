/** Strip tags and split a job description into plain paragraphs. */
export function plainParagraphs(text: string): string[] {
  const withoutBlocks = text.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ");
  const stripped = withoutBlocks.replace(/<[^>]+>/g, " ");
  return stripped
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter((paragraph) => paragraph.length > 0);
}
