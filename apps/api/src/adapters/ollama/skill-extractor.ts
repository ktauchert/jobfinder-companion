import type { SkillExtractor } from "../../ports/skill-extractor.js";
import type { OllamaClient } from "./client.js";

const EXTRACT_SCHEMA = `{ "skills": [{ "name": string, "confidence": number }] }`;

export function createOllamaSkillExtractor(options: {
  client: OllamaClient;
  model: string;
}): SkillExtractor {
  return {
    async extract(descriptionText: string) {
      const truncated = descriptionText.slice(0, 6000);
      const content = await options.client.chat({
        model: options.model,
        format: "json",
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "Extract technologies only: programming languages, frameworks, libraries, databases, DevOps tools, and explicit platforms (e.g. PHP, Laravel, Docker). " +
              "Do not list job tasks, responsibilities, soft skills, or full sentences. " +
              "Return at most 12 skills with confidence 0..1. Respond with JSON only matching the schema.",
          },
          {
            role: "user",
            content: `Schema: ${EXTRACT_SCHEMA}\n\nJob description:\n${truncated}`,
          },
        ],
      });

      return parseSkills(content);
    },
  };
}

function parseSkills(raw: string): { name: string; confidence: number }[] {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as {
      skills?: { name?: string; confidence?: number }[];
    };
    const skills = parsed.skills ?? [];
    return skills
      .filter((s): s is { name: string; confidence: number } =>
        Boolean(s.name && typeof s.confidence === "number"),
      )
      .map((s) => ({ name: s.name, confidence: Math.min(1, Math.max(0, s.confidence)) }));
  } catch {
    // retry parse after stripping non-json prefix/suffix
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const parsed = JSON.parse(cleaned.slice(start, end + 1)) as {
        skills?: { name?: string; confidence?: number }[];
      };
      return (parsed.skills ?? [])
        .filter((s): s is { name: string; confidence: number } =>
          Boolean(s.name && typeof s.confidence === "number"),
        )
        .map((s) => ({ name: s.name, confidence: s.confidence }));
    }
    throw new Error("Failed to parse skill extraction JSON from Ollama");
  }
}
