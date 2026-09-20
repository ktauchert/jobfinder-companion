import { createDb, jobSkills, skills, type Database } from "@jobfinder/database";
import type { Skill } from "@jobfinder/types";
import { eq, sql } from "drizzle-orm";

import type { SkillRepository } from "../../ports/skill-repository.js";

export function createDrizzleSkillRepository(databaseUrl: string): SkillRepository {
  return createDrizzleSkillRepositoryFromDb(createDb(databaseUrl));
}

export function createDrizzleSkillRepositoryFromDb(db: Database): SkillRepository {
  return {
    async findByNameOrAlias(name: string): Promise<Skill | null> {
      const rows = await db
        .select()
        .from(skills)
        .where(
          sql`${skills.name} = ${name} OR ${name} = ANY (${skills.aliases})`,
        )
        .limit(1);
      const row = rows[0];
      return row ? mapSkill(row) : null;
    },

    async findSimilar(name: string, threshold: number): Promise<Skill | null> {
      const rows = await db
        .select()
        .from(skills)
        .where(sql`similarity(${skills.name}, ${name}) >= ${threshold}`)
        .orderBy(sql`similarity(${skills.name}, ${name}) DESC`)
        .limit(1);
      const row = rows[0];
      return row ? mapSkill(row) : null;
    },

    async createSkill(input: { name: string; label: string; aliases: string[] }) {
      const rows = await db
        .insert(skills)
        .values(input)
        .onConflictDoNothing()
        .returning();

      const inserted = rows[0];
      if (inserted) {
        return mapSkill(inserted);
      }

      const existing = await this.findByNameOrAlias(input.name);
      if (!existing) {
        throw new Error(`Failed to create skill ${input.name}`);
      }
      return existing;
    },

    async upsertJobSkill(jobId: string, skillId: string, confidence: number) {
      await db
        .insert(jobSkills)
        .values({ jobId, skillId, confidence })
        .onConflictDoUpdate({
          target: [jobSkills.jobId, jobSkills.skillId],
          set: { confidence },
        });
    },

    async clearJobSkills(jobId: string) {
      await db.delete(jobSkills).where(eq(jobSkills.jobId, jobId));
    },
  };
}

function mapSkill(row: typeof skills.$inferSelect): Skill {
  return {
    id: row.id,
    name: row.name,
    label: row.label,
    aliases: row.aliases,
  };
}
