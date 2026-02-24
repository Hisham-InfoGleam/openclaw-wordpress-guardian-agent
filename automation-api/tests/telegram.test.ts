import type { Express } from "express";
import request from "supertest";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const processWpCommentWebhookMock = vi.fn(async () => undefined);
const applyModeratorDecisionMock = vi.fn(async () => undefined);
const answerTelegramCallbackMock = vi.fn(async () => undefined);
const isWordPressUpdateErrorMock = vi.fn(() => false);

vi.mock("../src/services/moderation-service", () => ({
  processWpCommentWebhook: processWpCommentWebhookMock,
  applyModeratorDecision: applyModeratorDecisionMock,
  isWordPressUpdateError: isWordPressUpdateErrorMock
}));

vi.mock("../src/clients/telegram-client", () => ({
  answerTelegramCallback: answerTelegramCallbackMock,
  sendReviewRequest: vi.fn()
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
  process.env.TELEGRAM_WEBHOOK_SECRET = "testvalue";
  process.env.AUTO_APPROVE_THRESHOLD = "0.8";
  process.env.AUTO_BLOCK_THRESHOLD = "0.95";
}

describe("POST /telegram/callback", () => {
  let app: Express;

  beforeAll(async () => {
    configureTestEnv();
    ({ default: app } = await import("../src/app"));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects malformed callback data", async () => {
    const payload = {
      callback_query: {
        id: "cb-1",
        data: "bad-format",
        message: {
          message_id: 12,
          chat: {
            id: 777
          }
        }
      }
    };

    const response = await request(app)
      .post("/telegram/callback")
      .set("x-telegram-bot-api-secret-token", process.env.TELEGRAM_WEBHOOK_SECRET as string)
      .send(payload);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("invalid_callback_data");
    expect(applyModeratorDecisionMock).not.toHaveBeenCalled();
    expect(answerTelegramCallbackMock).toHaveBeenCalledWith("cb-1", "Invalid callback payload.");
  });

  it("applies valid moderator decision using compact callback payload", async () => {
    const payload = {
      callback_query: {
        id: "cb-2",
        data: "r|321|a",
        message: {
          message_id: 13,
          chat: {
            id: 777
          }
        }
      }
    };

    const response = await request(app)
      .post("/telegram/callback")
      .set("x-telegram-bot-api-secret-token", process.env.TELEGRAM_WEBHOOK_SECRET as string)
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(applyModeratorDecisionMock).toHaveBeenCalledWith(321, "approve");
    expect(answerTelegramCallbackMock).toHaveBeenCalledWith("cb-2", "Applied decision: approve");
  });

  it("keeps compatibility with legacy callback payload", async () => {
    const payload = {
      callback_query: {
        id: "cb-legacy",
        data: "review|infogleam.com|654|evt-99|block",
        message: {
          message_id: 15,
          chat: {
            id: 777
          }
        }
      }
    };

    const response = await request(app)
      .post("/telegram/callback")
      .set("x-telegram-bot-api-secret-token", process.env.TELEGRAM_WEBHOOK_SECRET as string)
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(applyModeratorDecisionMock).toHaveBeenCalledWith(654, "block");
    expect(answerTelegramCallbackMock).toHaveBeenCalledWith("cb-legacy", "Applied decision: block");
  });

  it("rejects callback when secret header is missing", async () => {
    const payload = {
      callback_query: {
        id: "cb-3",
        data: "r|321|a",
        message: {
          message_id: 14,
          chat: {
            id: 777
          }
        }
      }
    };

    const response = await request(app).post("/telegram/callback").send(payload);

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("invalid_telegram_secret");
    expect(applyModeratorDecisionMock).not.toHaveBeenCalled();
  });

  it("returns 502 and clear error when WordPress auth fails", async () => {
    applyModeratorDecisionMock.mockRejectedValueOnce({ status: 401 });
    isWordPressUpdateErrorMock.mockReturnValueOnce(true);

    const payload = {
      callback_query: {
        id: "cb-auth-fail",
        data: "r|555|a",
        message: {
          message_id: 16,
          chat: {
            id: 777
          }
        }
      }
    };

    const response = await request(app)
      .post("/telegram/callback")
      .set("x-telegram-bot-api-secret-token", process.env.TELEGRAM_WEBHOOK_SECRET as string)
      .send(payload);

    expect(response.status).toBe(502);
    expect(response.body.error).toBe("wordpress_auth_failed");
    expect(answerTelegramCallbackMock).toHaveBeenCalledWith(
      "cb-auth-fail",
      "WordPress auth failed. Check WP_APP_USERNAME and WP_APP_PASSWORD."
    );
  });
});
