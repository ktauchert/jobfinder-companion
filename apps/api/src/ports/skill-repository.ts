import type { Skill } from "@jobfinder/types";

export interface SkillRepository {
  findByNameOrAlias(name: string): Promise<Skill | null>;
  findSimilar(name: string, threshold: number): Promise<Skill | null>;
  createSkill(input: { name: string; label: string; aliases: string[] }): Promise<Skill>;
  upsertJobSkill(jobId: string, skillId: string, confidence: number): Promise<void>;
  clearJobSkills(jobId: string): Promise<void>;
  search(query: string, limit: number): Promise<Skill[]>;
}
