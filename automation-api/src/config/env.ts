import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envBoolean = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on") {
      return true;
    }

    if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "off") {
      return false;
    }
  }

  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  WEBHOOK_SHARED_SECRET: z.string().min(16, "WEBHOOK_SHARED_SECRET is required."),
  WP_BASE_URL: z.string().url(),
  WP_APP_USERNAME: z.string().min(1),
  WP_APP_PASSWORD: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_CHAT_ID: z.string().min(1),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(8).optional(),
  MODERATION_PROVIDER: z.enum(["heuristic", "openclaw"]).default("heuristic"),
  OPENCLAW_BASE_URL: z.string().url().default("http://127.0.0.1:18789"),
  OPENCLAW_GATEWAY_TOKEN: z.string().min(8).optional(),
  OPENCLAW_MODEL: z.string().min(1).default("openai/o4-mini"),
  OPENCLAW_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  OPENCLAW_FALLBACK_TO_HEURISTIC: envBoolean.default(true),
  AUTO_APPROVE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.9),
  AUTO_BLOCK_THRESHOLD: z.coerce.number().min(0).max(1).default(0.9)
}).superRefine((input, ctx) => {
  if (input.NODE_ENV === "production" && !input.TELEGRAM_WEBHOOK_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["TELEGRAM_WEBHOOK_SECRET"],
      message: "TELEGRAM_WEBHOOK_SECRET is required in production."
    });
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const message = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
  throw new Error(`Invalid environment configuration: ${message}`);
}

export const env = parsed.data;
