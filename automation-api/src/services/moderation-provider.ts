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
        moderation: openclaw.moderation
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
