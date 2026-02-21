import { sendReviewRequest } from "../clients/telegram-client";
import { updateWordPressCommentStatus } from "../clients/wordpress-client";
import { ModerationDecision } from "../skills/moderation-skill";
import { WpCommentWebhook } from "../schemas/wp-comment";
import { selectModeration } from "./moderation-provider";
import { log } from "../utils/logger";

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

  await updateWordPressCommentStatus(input.comment.id, moderation.decision);
}

export async function applyModeratorDecision(commentId: number, decision: ModerationDecision): Promise<void> {
  if (decision === "needs_review") {
    return;
  }

  await updateWordPressCommentStatus(commentId, decision);
}
