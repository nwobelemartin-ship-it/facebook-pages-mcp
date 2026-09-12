import { z } from "zod";

const EnvSchema = z.object({
  // Optional at boot: refresh_token_info accepts an explicit `token` argument,
  // so the env var is not strictly required for every flow. When missing,
  // src/client.ts raises a clear error on the first token-needing call.
  FB_PAGE_ACCESS_TOKEN: z.string().min(1).optional(),
  FB_PAGE_ID: z.string().min(1).optional(),

  // Container runtime
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment configuration:");
    for (const issue of parsed.error.issues) {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }
  if (!parsed.data.FB_PAGE_ACCESS_TOKEN) {
    console.warn(
      "[env] FB_PAGE_ACCESS_TOKEN is not set. Tools that call the Graph API " +
        "without an explicit `token` argument will fail."
    );
  }
  cached = parsed.data;
  return cached;
}
