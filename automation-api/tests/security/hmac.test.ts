import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { isValidHmacSignature } from "../../src/security/hmac";

const SHARED_SECRET = "0123456789abcdef";

function sign(value: Buffer): string {
  return createHmac("sha256", SHARED_SECRET).update(value).digest("hex");
}

describe("isValidHmacSignature", () => {
  it("returns false when raw body is missing", () => {
    expect(isValidHmacSignature(undefined, "sha256=abcd", SHARED_SECRET)).toBe(false);
  });

  it("returns false when signature header is missing", () => {
    expect(isValidHmacSignature(Buffer.from("{}"), undefined, SHARED_SECRET)).toBe(false);
  });

  it("accepts valid signature with sha256 prefix", () => {
    const body = Buffer.from('{"event":"wp.comment.created"}');
    const signature = `sha256=${sign(body)}`;

    expect(isValidHmacSignature(body, signature, SHARED_SECRET)).toBe(true);
  });

  it("accepts valid signature with uppercase prefix", () => {
    const body = Buffer.from('{"event":"wp.comment.created"}');
    const signature = `SHA256=${sign(body)}`;

    expect(isValidHmacSignature(body, signature, SHARED_SECRET)).toBe(true);
  });

  it("rejects malformed non-hex signature", () => {
    const body = Buffer.from('{"event":"wp.comment.created"}');

    expect(isValidHmacSignature(body, "sha256=not-a-hex-value", SHARED_SECRET)).toBe(false);
  });

  it("rejects odd-length signature", () => {
    const body = Buffer.from('{"event":"wp.comment.created"}');

    expect(isValidHmacSignature(body, "sha256=abc", SHARED_SECRET)).toBe(false);
  });

  it("rejects valid signature for different raw bytes", () => {
    const originalBody = Buffer.from('{"a":1,"b":2}');
    const reorderedBody = Buffer.from('{"b":2,"a":1}');
    const signature = `sha256=${sign(originalBody)}`;

    expect(isValidHmacSignature(reorderedBody, signature, SHARED_SECRET)).toBe(false);
  });
});
