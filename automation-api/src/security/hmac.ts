import { createHmac, timingSafeEqual } from "crypto";

function isHex(value: string): boolean {
  return value.length > 0 && value.length % 2 === 0 && /^[0-9a-f]+$/i.test(value);
}

function normalizeSignature(signatureHeader: string): string {
  const value = signatureHeader.trim();
  if (value.toLowerCase().startsWith("sha256=")) {
    return value.slice("sha256=".length);
  }
  return value;
}

export function isValidHmacSignature(rawBody: Buffer | undefined, signatureHeader: string | undefined, secret: string): boolean {
  if (!rawBody || !signatureHeader) {
    return false;
  }

  const incomingHex = normalizeSignature(signatureHeader);
  if (!isHex(incomingHex)) {
    return false;
  }

  const expectedHex = createHmac("sha256", secret).update(rawBody).digest("hex");

  const incomingBuffer = Buffer.from(incomingHex, "hex");
  const expectedBuffer = Buffer.from(expectedHex, "hex");

  if (incomingBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(incomingBuffer, expectedBuffer);
}
