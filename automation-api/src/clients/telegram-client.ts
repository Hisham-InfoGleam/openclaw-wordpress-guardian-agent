import { env } from "../config/env";

type ReviewPayload = {
  eventId: string;
  site: string;
  commentId: number;
  content: string;
  reason: string;
  signals: string[];
};

function getTelegramBaseUrl(): string {
  return `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`;
}

function truncateContent(value: string): string {
  if (value.length <= 800) {
    return value;
  }
  return `${value.slice(0, 800)}…`;
}

export async function sendReviewRequest(payload: ReviewPayload): Promise<void> {
  const callbackBase = `r|${payload.commentId}`;
  const text = [
    "⚠️ Comment needs review",
    `Site: ${payload.site}`,
    `Comment ID: ${payload.commentId}`,
    `Reason: ${payload.reason}`,
    `Signals: ${payload.signals.join(", ") || "none"}`,
    "",
    truncateContent(payload.content)
  ].join("\n");

  const response = await fetch(`${getTelegramBaseUrl()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "Approve", callback_data: `${callbackBase}|a` },
            { text: "Block", callback_data: `${callbackBase}|b` }
          ]
        ]
      }
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram sendMessage failed: ${response.status} ${body}`);
  }
}

export async function answerTelegramCallback(callbackQueryId: string, text: string): Promise<void> {
  const response = await fetch(`${getTelegramBaseUrl()}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: false
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram answerCallbackQuery failed: ${response.status} ${body}`);
  }
}
