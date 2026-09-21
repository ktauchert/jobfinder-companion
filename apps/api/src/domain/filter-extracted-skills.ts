export interface ExtractedSkill {
  name: string;
  confidence: number;
}

const MIN_CONFIDENCE = 0.5;
const MAX_NAME_LENGTH = 40;
const MAX_WORDS = 4;

/** Drop low-confidence and sentence-like extractions before canonicalisation. */
export function filterExtractedSkills(skills: ExtractedSkill[]): ExtractedSkill[] {
  return skills.filter(
    (skill) => isTechnologyLikeSkill(skill.name) && skill.confidence >= MIN_CONFIDENCE,
  );
}

function isTechnologyLikeSkill(rawName: string): boolean {
  const name = rawName.trim();
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) {
    return false;
  }

  const words = name.split(/[\s/+,]+/).filter(Boolean);
  if (words.length === 0 || words.length > MAX_WORDS) {
    return false;
  }

  return true;
}
