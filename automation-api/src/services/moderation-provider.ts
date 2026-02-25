import { runOpenClawModeration } from "../clients/openclaw-client";
import { env } from "../config/env";
import { ModerationResult, runModerationSkill } from "../skills/moderation-skill";
import { log } from "../utils/logger";

export type ModerationProvider = "heuristic" | "openclaw";

export type ModerationSelection = {
  provider: ModerationProvider;
  model?: string;
  moderation: ModerationResult;
};

function normalizeOpenClawModeration(input: {
  moderation: ModerationResult;
  correlationId: string;
  eventId: string;
  commentId: number;
}): ModerationResult {
  const { moderation } = input;

  if (moderation.decision === "needs_review") {
    return moderation;
  }

  const threshold = moderation.decision === "approve" ? env.AUTO_APPROVE_THRESHOLD : env.AUTO_BLOCK_THRESHOLD;

  if (moderation.confidence >= threshold) {
    return moderation;
  }

  log("info", "OpenClaw decision downgraded to needs_review due to low confidence", {
    correlationId: input.correlationId,
    eventId: input.eventId,
    commentId: input.commentId,
    originalDecision: moderation.decision,
    confidence: moderation.confidence,
    threshold
  });

  return {
    decision: "needs_review",
    confidence: moderation.confidence,
    reason: `${moderation.reason} [downgraded_low_confidence]`,
    signals: moderation.signals.includes("low_confidence") ? moderation.signals : [...moderation.signals, "low_confidence"]
  };
}

export async function selectModeration(input: {
  correlationId: string;
  site: string;
  eventId: string;
  commentId: number;
  content: string;
}): Promise<ModerationSelection> {
  if (env.MODERATION_PROVIDER === "openclaw") {
    try {
      const openclaw = await runOpenClawModeration({
        site: input.site,
        eventId: input.eventId,
        commentId: input.commentId,
        content: input.content
      });

      return {
        provider: "openclaw",
        model: openclaw.model,
        moderation: normalizeOpenClawModeration({
          moderation: openclaw.moderation,
          correlationId: input.correlationId,
          eventId: input.eventId,
          commentId: input.commentId
        })
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown OpenClaw error";
      log("warn", "OpenClaw moderation failed", {
        correlationId: input.correlationId,
        eventId: input.eventId,
        commentId: input.commentId,
        message,
        fallbackEnabled: env.OPENCLAW_FALLBACK_TO_HEURISTIC
      });

      if (!env.OPENCLAW_FALLBACK_TO_HEURISTIC) {
        throw error;
      }
    }
  }

  return {
    provider: "heuristic",
    moderation: runModerationSkill(input.content, {
      approve: env.AUTO_APPROVE_THRESHOLD,
      block: env.AUTO_BLOCK_THRESHOLD
    })
  };
}
