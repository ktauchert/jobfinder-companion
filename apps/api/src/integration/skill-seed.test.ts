import { createDb, seedSkills, skills, type Database } from "@jobfinder/database";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)("integration: skill seed", () => {
  let db: Database | undefined;

  beforeAll(() => {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is required");
    }
    db = createDb(url);
  });

  afterAll(async () => {
    if (db) {
      await seedSkills(db);
    }
  });

  it("upserts on a second run without adding rows", async () => {
    if (!db) {
      throw new Error("DATABASE_URL is required");
    }
    await seedSkills(db);
    const before = await db
      .select({ name: skills.name, label: skills.label, aliases: skills.aliases })
      .from(skills);

    await db
      .update(skills)
      .set({ label: "temp-label", aliases: ["temp-alias"] })
      .where(eq(skills.name, "typescript"));

    await seedSkills(db);
    const after = await db
      .select({ name: skills.name, label: skills.label, aliases: skills.aliases })
      .from(skills);

    expect(after).toHaveLength(before.length);
    expect(new Set(after.map((row) => row.name)).size).toBe(after.length);

    const typescript = after.find((row) => row.name === "typescript");
    expect(typescript?.label).toBe("TypeScript");
    expect(typescript?.aliases).toContain("ts");
  });
});
