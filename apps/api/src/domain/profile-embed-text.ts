/** Text embedded for profile similarity search (`summary` + must-have skills). */
export function buildProfileEmbedText(summary: string, mustHaveSkills: string[]): string {
  const parts = [
    summary.trim(),
    ...mustHaveSkills.map((skill) => skill.trim()).filter(Boolean),
  ].filter(Boolean);

  return parts.join(" · ");
}
