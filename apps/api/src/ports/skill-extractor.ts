export interface ExtractedSkill {
  name: string;
  confidence: number;
}

export interface SkillExtractor {
  extract(descriptionText: string): Promise<ExtractedSkill[]>;
}
