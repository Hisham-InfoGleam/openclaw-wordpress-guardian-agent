import { timingSafeEqual } from "crypto";

export const TELEGRAM_SECRET_HEADER = "x-telegram-bot-api-secret-token";

export function isValidTelegramSecret(incoming: string | undefined, expected: string): boolean {
  if (!incoming) {
    return false;
  }

  const incomingBuffer = Buffer.from(incoming, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (incomingBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(incomingBuffer, expectedBuffer);
}
