import { Router } from "express";
import { env } from "../config/env";
import { createSimpleRateLimiter } from "../middleware/rate-limit";
import { wpCommentWebhookSchema } from "../schemas/wp-comment";
import { isValidHmacSignature } from "../security/hmac";
import { processWpCommentWebhook } from "../services/moderation-service";
import { log } from "../utils/logger";

const WORDPRESS_SIGNATURE_HEADER = "x-wp-signature";
const webhookRateLimit = createSimpleRateLimiter(60, 60_000);

export const webhooksRouter = Router();

webhooksRouter.post("/wp-comment", webhookRateLimit, async (req, res, next) => {
  try {
    const correlationId = req.correlationId ?? "unknown";
    const signatureHeader = req.header(WORDPRESS_SIGNATURE_HEADER);
    const validSignature = isValidHmacSignature(req.rawBody, signatureHeader, env.WEBHOOK_SHARED_SECRET);

    if (!validSignature) {
      log("warn", "Invalid webhook signature", {
        correlationId,
        hasRawBody: Boolean(req.rawBody),
        signatureHeaderPresent: Boolean(signatureHeader)
      });
      return res.status(401).json({ error: "invalid_signature", correlationId });
    }

    const payload = wpCommentWebhookSchema.parse(req.body);
    void processWpCommentWebhook(payload, correlationId).catch((error) => {
      const message = error instanceof Error ? error.message : "Unknown async error";
      log("error", "Failed async webhook processing", {
        correlationId,
        eventId: payload.eventId,
        commentId: payload.comment.id,
        message
      });
    });

    return res.status(202).json({ status: "accepted", correlationId });
  } catch (error) {
    return next(error);
  }
});
