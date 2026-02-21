export type ModerationDecision = "approve" | "block" | "needs_review";

export type ModerationResult = {
  decision: ModerationDecision;
  confidence: number;
  reason: string;
  signals: string[];
};

const BLOCK_KEYWORDS = ["viagra", "casino", "crypto giveaway", "porn", "xbet", "loan now"];

function detectSignals(commentContent: string): string[] {
  const lowered = commentContent.toLowerCase();
  const signals: string[] = [];

  if (/(https?:\/\/|www\.)/.test(lowered)) {
    signals.push("contains_link");
  }

  if (/[\u0600-\u06FF]/.test(commentContent) && commentContent.length < 30) {
    signals.push("short_non_latin");
  }

  if (/!{3,}|\?{3,}/.test(commentContent)) {
    signals.push("excessive_punctuation");
  }

  if (BLOCK_KEYWORDS.some((word) => lowered.includes(word))) {
    signals.push("spam_keyword");
  }

  return signals;
}

export function runModerationSkill(
  commentContent: string,
  thresholds: { approve: number; block: number }
): ModerationResult {
  const signals = detectSignals(commentContent);

  if (signals.includes("spam_keyword")) {
    return {
      decision: "block",
      confidence: 0.99,
      reason: "Spam keyword matched.",
      signals
    };
  }

  if (signals.length === 0 && commentContent.length > 20) {
    return {
      decision: "approve",
      confidence: Math.max(0.92, thresholds.approve),
      reason: "No suspicious signals detected.",
      signals
    };
  }

  if (signals.includes("contains_link") && signals.length > 1) {
    return {
      decision: "block",
      confidence: Math.max(0.9, thresholds.block),
      reason: "Suspicious link pattern with additional spam signals.",
      signals
    };
  }

  return {
    decision: "needs_review",
    confidence: 0.6,
    reason: "Human review required for uncertain moderation outcome.",
    signals
  };
}
