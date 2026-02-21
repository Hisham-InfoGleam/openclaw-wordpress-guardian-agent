import { createHmac } from "crypto";
import type { Express } from "express";
import request from "supertest";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const processWpCommentWebhookMock = vi.fn(async () => undefined);
const applyModeratorDecisionMock = vi.fn(async () => undefined);

vi.mock("../src/services/moderation-service", () => ({
  processWpCommentWebhook: processWpCommentWebhookMock,
  applyModeratorDecision: applyModeratorDecisionMock
}));

function configureTestEnv(): void {
  process.env.NODE_ENV = "test";
  process.env.PORT = "3001";
  process.env.WEBHOOK_SHARED_SECRET = "0123456789abcdef";
  process.env.WP_BASE_URL = "https://example.com";
  process.env.WP_APP_USERNAME = "test-user";
  process.env.WP_APP_PASSWORD = "test-password";
  process.env.TELEGRAM_BOT_TOKEN = "test-token";
  process.env.TELEGRAM_CHAT_ID = "12345";
  process.env.AUTO_APPROVE_THRESHOLD = "0.8";
  process.env.AUTO_BLOCK_THRESHOLD = "0.95";
}

function signBody(rawBody: string): string {
  const secret = process.env.WEBHOOK_SHARED_SECRET as string;
  const signature = createHmac("sha256", secret).update(rawBody).digest("hex");
  return `sha256=${signature}`;
}

describe("POST /hooks/wp-comment", () => {
  let app: Express;

  beforeAll(async () => {
    configureTestEnv();
    ({ default: app } = await import("../src/app"));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid signature", async () => {
    const payload = {
      event: "wp.comment.created",
      eventId: "evt-1",
      site: "infogleam.com",
      comment: {
        id: 123,
        postId: 456,
        authorName: "Test User",
        authorUrl: null,
        content: "hello world",
        createdAt: "2026-02-18T10:00:00.000Z"
      }
    };

    const response = await request(app)
      .post("/hooks/wp-comment")
      .set("content-type", "application/json")
      .set("x-wp-signature", "sha256=bad-signature")
      .send(JSON.stringify(payload));

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("invalid_signature");
    expect(processWpCommentWebhookMock).not.toHaveBeenCalled();
  });

  it("accepts valid signature and schedules processing", async () => {
    const payload = {
      event: "wp.comment.created",
      eventId: "evt-2",
      site: "infogleam.com",
      comment: {
        id: 124,
        postId: 456,
        authorName: "Test User",
        authorUrl: null,
        content: "hello world from test",
        createdAt: "2026-02-18T10:00:00.000Z"
      }
    };

    const rawBody = JSON.stringify(payload);

    const response = await request(app)
      .post("/hooks/wp-comment")
      .set("content-type", "application/json")
      .set("x-wp-signature", signBody(rawBody))
      .send(rawBody);

    expect(response.status).toBe(202);
    expect(response.body.status).toBe("accepted");
    expect(processWpCommentWebhookMock).toHaveBeenCalledTimes(1);
    expect(processWpCommentWebhookMock).toHaveBeenCalledWith(payload, expect.any(String));
  });
});
