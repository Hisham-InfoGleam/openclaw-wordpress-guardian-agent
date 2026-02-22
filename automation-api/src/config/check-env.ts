import { env } from "./env";

const summary = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  moderationProvider: env.MODERATION_PROVIDER,
  openclawBaseUrl: env.OPENCLAW_BASE_URL,
  openclawModel: env.OPENCLAW_MODEL,
  openclawTimeoutMs: env.OPENCLAW_TIMEOUT_MS,
  autoApproveThreshold: env.AUTO_APPROVE_THRESHOLD,
  autoBlockThreshold: env.AUTO_BLOCK_THRESHOLD,
  hasOpenclawGatewayToken: Boolean(env.OPENCLAW_GATEWAY_TOKEN),
  hasTelegramWebhookSecret: Boolean(env.TELEGRAM_WEBHOOK_SECRET),
  wpBaseUrlHost: new URL(env.WP_BASE_URL).host
};

console.log("Environment validation passed.");
console.log(JSON.stringify(summary, null, 2));
