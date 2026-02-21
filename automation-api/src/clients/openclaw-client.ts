import { env } from "../config/env";
import { ModerationResult } from "../skills/moderation-skill";

type OpenAIChatChoice = {
  message?: {
    content?: string | Array<{ type?: string; text?: string }>;
  };
};

type OpenAIMessageContent = OpenAIChatChoice["message"] extends infer Message
  ? Message extends { content?: infer Content }
    ? Content
    : never
  : never;

type OpenAIChatResponse = {
  choices?: OpenAIChatChoice[];
};

function extractTextContent(content: OpenAIMessageContent | undefined): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .filter((part) => (part.type ?? "text") === "text")
      .map((part) => part.text ?? "")
      .join("\n");
  }

  return "";
}

function parseModerationJson(text: string): ModerationResult {
  const trimmed = text.trim();
  const jsonCandidate = trimmed.startsWith("{")
    ? trimmed
    : trimmed.slice(trimmed.indexOf("{"), trimmed.lastIndexOf("}") + 1);

  const parsed = JSON.parse(jsonCandidate) as Partial<ModerationResult>;

  const decision = parsed.decision;
  if (decision !== "approve" && decision !== "block" && decision !== "needs_review") {
    throw new Error("OpenClaw moderation response missing valid decision");
  }

  const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.5;
  const reason = typeof parsed.reason === "string" && parsed.reason.length > 0 ? parsed.reason : "OpenClaw decision";
  const signals = Array.isArray(parsed.signals) ? parsed.signals.filter((value): value is string => typeof value === "string") : [];

  return {
    decision,
    confidence: Math.min(1, Math.max(0, confidence)),
    reason,
    signals
  };
}

export async function runOpenClawModeration(input: {
  site: string;
  eventId: string;
  commentId: number;
  content: string;
}): Promise<{ moderation: ModerationResult; model: string }> {
  const prompt = [
    "You are OpenClaw moderation policy engine for WordPress comments.",
    "Return ONLY compact JSON with keys: decision, confidence, reason, signals.",
    "Allowed decisions: approve | block | needs_review.",
    "Confidence must be between 0 and 1.",
    "Use needs_review when uncertain.",
    "",
    `Site: ${input.site}`,
    `Event: ${input.eventId}`,
    `CommentId: ${input.commentId}`,
    "Comment:",
    input.content
  ].join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.OPENCLAW_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (env.OPENCLAW_GATEWAY_TOKEN) {
      headers.Authorization = `Bearer ${env.OPENCLAW_GATEWAY_TOKEN}`;
    }

    const response = await fetch(`${env.OPENCLAW_BASE_URL.replace(/\/$/, "")}/v1/chat/completions`, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: env.OPENCLAW_MODEL,
        temperature: 0,
        messages: [
          {
            role: "system",
            content: "Classify WordPress comments for moderation. Output JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenClaw gateway error ${response.status}: ${body}`);
    }

    const data = (await response.json()) as OpenAIChatResponse;
    const content = extractTextContent(data.choices?.[0]?.message?.content);

    if (!content) {
      throw new Error("OpenClaw response did not include text content");
    }

    return {
      moderation: parseModerationJson(content),
      model: env.OPENCLAW_MODEL
    };
  } finally {
    clearTimeout(timeout);
  }
}
