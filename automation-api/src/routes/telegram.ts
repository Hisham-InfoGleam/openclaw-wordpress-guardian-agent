import { Router } from "express";
import { answerTelegramCallback } from "../clients/telegram-client";
import { env } from "../config/env";
import { telegramCallbackSchema } from "../schemas/telegram";
import { isValidTelegramSecret, TELEGRAM_SECRET_HEADER } from "../security/telegram-secret";
import { applyModeratorDecision } from "../services/moderation-service";
import { log } from "../utils/logger";

function parseCallbackData(rawData: string): { commentId: number; decision: "approve" | "block" } | null {
  const parts = rawData.split("|");

  if (parts.length === 3) {
    const [prefix, commentIdRaw, decisionRaw] = parts;
    if (prefix !== "r") {
      return null;
    }

    const commentId = Number.parseInt(commentIdRaw, 10);
    if (!Number.isInteger(commentId) || commentId <= 0) {
      return null;
    }

    if (decisionRaw === "a" || decisionRaw === "approve") {
      return { commentId, decision: "approve" };
    }
    if (decisionRaw === "b" || decisionRaw === "block") {
      return { commentId, decision: "block" };
    }

    return null;
  }

  if (parts.length === 5) {
    const [prefix, site, commentIdRaw, eventId, decision] = parts;

    if (prefix !== "review" || !site || !eventId || (decision !== "approve" && decision !== "block")) {
      return null;
    }

    const commentId = Number.parseInt(commentIdRaw, 10);
    if (!Number.isInteger(commentId) || commentId <= 0) {
      return null;
    }

    return { commentId, decision };
  }

  return null;
}

export const telegramRouter = Router();

telegramRouter.post("/callback", async (req, res, next) => {
  try {
    if (env.TELEGRAM_WEBHOOK_SECRET) {
      const incomingSecret = req.header(TELEGRAM_SECRET_HEADER);
      const validSecret = isValidTelegramSecret(incomingSecret, env.TELEGRAM_WEBHOOK_SECRET);

      if (!validSecret) {
        log("warn", "Invalid telegram callback secret", {
          correlationId: req.correlationId
        });
        return res.status(401).json({ error: "invalid_telegram_secret", correlationId: req.correlationId });
      }
    }

    const payload = telegramCallbackSchema.parse(req.body);
    const callback = payload.callback_query;

    const parsed = parseCallbackData(callback.data);
    if (!parsed) {
      log("warn", "Invalid telegram callback data", {
        correlationId: req.correlationId
      });
      await answerTelegramCallback(callback.id, "Invalid callback payload.");
      return res.status(400).json({ error: "invalid_callback_data", correlationId: req.correlationId });
    }

    await applyModeratorDecision(parsed.commentId, parsed.decision);
    await answerTelegramCallback(callback.id, `Applied decision: ${parsed.decision}`);

    return res.status(200).json({ status: "ok", correlationId: req.correlationId });
  } catch (error) {
    return next(error);
  }
});
