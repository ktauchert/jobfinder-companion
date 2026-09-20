import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

  // Docker Compose / infra (optional for the API process; present in .env.example).
  POSTGRES_USER: z.string().optional(),
  POSTGRES_PASSWORD: z.string().optional(),
  POSTGRES_DB: z.string().optional(),
  POSTGRES_PORT: z.coerce.number().int().positive().optional(),
  REDIS_PORT: z.coerce.number().int().positive().optional(),
  OLLAMA_PORT: z.coerce.number().int().positive().optional(),
  WEB_PORT: z.coerce.number().int().positive().optional(),
  VITE_API_BASE_URL: z.string().url().optional(),
  CADDY_DOMAIN: z.string().optional(),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  OLLAMA_BASE_URL: z.string().url(),
  OLLAMA_EMBED_MODEL: z.string().min(1),
  OLLAMA_EXTRACT_MODEL: z.string().min(1),

  API_PORT: z.coerce.number().int().positive(),
  API_BASE_URL: z.string().url(),
  CORS_ORIGIN: z.string().min(1),

  BA_CLIENT_ID: z.string().min(1).default("jobboerse-jobsuche"),

  // Paid sources: empty string means "not configured".
  ADZUNA_APP_ID: z.string().default(""),
  ADZUNA_APP_KEY: z.string().default(""),
  APIFY_TOKEN: z.string().default(""),

  WORKERS_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
});

export type Env = z.infer<typeof envSchema>;

export class EnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvError";
  }
}

/**
 * Validate process.env (or a test double). Fail fast with the variable name(s)
 * in the message so a missing key is obvious at boot.
 */
export function loadEnv(source: NodeJS.ProcessEnv | Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (result.success) {
    return result.data;
  }

  const names = [...new Set(result.error.issues.map((issue) => issue.path.join(".") || "unknown"))];
  throw new EnvError(`Invalid environment: ${names.join(", ")}`);
}
