export interface ExtractedSkillCandidate {
  name: string;
  confidence: number;
}

export interface FilterExtractedSkillsOptions {
  minConfidence?: number;
  maxNameLength?: number;
  maxTokenCount?: number;
  maxSkills?: number;
}

const DEFAULTS = {
  minConfidence: 0.55,
  maxNameLength: 48,
  maxTokenCount: 2,
  maxSkills: 20,
} as const;

/** Drop sentence-like or low-confidence model output before canonicalisation. */
export function filterExtractedSkills(
  skills: ExtractedSkillCandidate[],
  options?: FilterExtractedSkillsOptions,
): ExtractedSkillCandidate[] {
  const opts = { ...DEFAULTS, ...options };

  return skills
    .filter((skill) => skill.confidence >= opts.minConfidence)
    .filter((skill) => {
      const name = skill.name.trim();
      return name.length > 0 && name.length <= opts.maxNameLength;
    })
    .filter((skill) => countTokens(skill.name) <= opts.maxTokenCount)
    .slice(0, opts.maxSkills);
}

function countTokens(name: string): number {
  return name.trim().split(/\s+/).filter(Boolean).length;
}
