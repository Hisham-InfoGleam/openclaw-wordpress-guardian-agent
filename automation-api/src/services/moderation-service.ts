import { sendReviewRequest } from "../clients/telegram-client";
import { isWordPressAuthFailure, updateWordPressCommentStatus, WordPressUpdateError } from "../clients/wordpress-client";
import { ModerationDecision } from "../skills/moderation-skill";
import { WpCommentWebhook } from "../schemas/wp-comment";
import { selectModeration } from "./moderation-provider";
import { log } from "../utils/logger";

async function applyAutoDecision(input: {
  commentId: number;
  decision: "approve" | "block";
  eventId: string;
  site: string;
  content: string;
  reason: string;
  signals: string[];
  correlationId: string;
}): Promise<void> {
  try {
    await updateWordPressCommentStatus(input.commentId, input.decision);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown WordPress update error";
    const authFailure = isWordPressAuthFailure(error);

    log("warn", "Auto decision WordPress update failed", {
      correlationId: input.correlationId,
      eventId: input.eventId,
      commentId: input.commentId,
      decision: input.decision,
      authFailure,
      message
    });

    await sendReviewRequest({
      eventId: input.eventId,
      site: input.site,
      commentId: input.commentId,
      content: input.content,
      reason: `${input.reason} [auto_apply_failed=${authFailure ? "wp_auth_failed" : "wp_update_failed"}]`,
      signals: [...input.signals, authFailure ? "wp_auth_failed" : "wp_update_failed"]
    });
  }
}

export function isWordPressUpdateError(error: unknown): error is WordPressUpdateError {
  return error instanceof WordPressUpdateError;
}

export async function processWpCommentWebhook(input: WpCommentWebhook, correlationId: string): Promise<void> {
  const selected = await selectModeration({
    correlationId,
    site: input.site,
    eventId: input.eventId,
    commentId: input.comment.id,
    content: input.comment.content
  });
  const moderation = selected.moderation;

  log("info", "Moderation computed", {
    correlationId,
    eventId: input.eventId,
    commentId: input.comment.id,
    provider: selected.provider,
    model: selected.model,
    decision: moderation.decision,
    confidence: moderation.confidence,
    signals: moderation.signals
  });

  if (moderation.decision === "needs_review") {
    await sendReviewRequest({
      eventId: input.eventId,
      site: input.site,
      commentId: input.comment.id,
      content: input.comment.content,
      reason: `${moderation.reason} [provider=${selected.provider}${selected.model ? ` model=${selected.model}` : ""}]`,
      signals: moderation.signals
    });
    return;
  }

  await applyAutoDecision({
    commentId: input.comment.id,
    decision: moderation.decision,
    eventId: input.eventId,
    site: input.site,
    content: input.comment.content,
    reason: moderation.reason,
    signals: moderation.signals,
    correlationId
  });
}

export async function applyModeratorDecision(commentId: number, decision: ModerationDecision): Promise<void> {
  if (decision === "needs_review") {
    return;
  }

  await updateWordPressCommentStatus(commentId, decision);
}
