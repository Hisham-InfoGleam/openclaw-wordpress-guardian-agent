import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const runOpenClawModerationMock = vi.fn();

vi.mock("../src/clients/openclaw-client", () => ({
  runOpenClawModeration: runOpenClawModerationMock
}));

describe("selectModeration", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
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
    process.env.MODERATION_PROVIDER = "openclaw";
    process.env.OPENCLAW_BASE_URL = "http://127.0.0.1:18789";
    process.env.OPENCLAW_MODEL = "openai/o4-mini";
    process.env.OPENCLAW_TIMEOUT_MS = "5000";
    process.env.OPENCLAW_FALLBACK_TO_HEURISTIC = "true";

    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("uses OpenClaw decision when provider is openclaw", async () => {
    runOpenClawModerationMock.mockResolvedValueOnce({
      model: "openai/o4-mini",
      moderation: {
        decision: "block",
        confidence: 0.98,
        reason: "Spam pattern from OpenClaw",
        signals: ["spam_keyword"]
      }
    });

    const { selectModeration } = await import("../src/services/moderation-provider");

    const result = await selectModeration({
      correlationId: "corr-1",
      site: "infogleam.com",
      eventId: "evt-1",
      commentId: 10,
      content: "spam comment"
    });

    expect(result.provider).toBe("openclaw");
    expect(result.model).toBe("openai/o4-mini");
    expect(result.moderation.decision).toBe("block");
  });

  it("downgrades OpenClaw approve decision to needs_review when confidence is below approve threshold", async () => {
    process.env.AUTO_APPROVE_THRESHOLD = "0.9";
    vi.resetModules();

    runOpenClawModerationMock.mockResolvedValueOnce({
      model: "openai/o4-mini",
      moderation: {
        decision: "approve",
        confidence: 0.61,
        reason: "Likely safe",
        signals: []
      }
    });

    const { selectModeration } = await import("../src/services/moderation-provider");

    const result = await selectModeration({
      correlationId: "corr-1b",
      site: "infogleam.com",
      eventId: "evt-1b",
      commentId: 14,
      content: "normal discussion comment"
    });

    expect(result.provider).toBe("openclaw");
    expect(result.moderation.decision).toBe("needs_review");
    expect(result.moderation.signals).toContain("low_confidence");
  });

  it("keeps OpenClaw block decision when confidence meets block threshold", async () => {
    process.env.AUTO_BLOCK_THRESHOLD = "0.95";
    vi.resetModules();

    runOpenClawModerationMock.mockResolvedValueOnce({
      model: "openai/o4-mini",
      moderation: {
        decision: "block",
        confidence: 0.98,
        reason: "High spam confidence",
        signals: ["spam_keyword"]
      }
    });

    const { selectModeration } = await import("../src/services/moderation-provider");

    const result = await selectModeration({
      correlationId: "corr-1c",
      site: "infogleam.com",
      eventId: "evt-1c",
      commentId: 15,
      content: "spam comment"
    });

    expect(result.provider).toBe("openclaw");
    expect(result.moderation.decision).toBe("block");
    expect(result.moderation.signals).toContain("spam_keyword");
  });

  it("falls back to heuristic when OpenClaw fails and fallback enabled", async () => {
    runOpenClawModerationMock.mockRejectedValueOnce(new Error("Gateway unavailable"));

    const { selectModeration } = await import("../src/services/moderation-provider");

    const result = await selectModeration({
      correlationId: "corr-2",
      site: "infogleam.com",
      eventId: "evt-2",
      commentId: 11,
      content: "Looks fine and harmless for regular discussion"
    });

    expect(result.provider).toBe("heuristic");
    expect(["approve", "needs_review", "block"]).toContain(result.moderation.decision);
  });

  it("throws when OpenClaw fails and fallback disabled", async () => {
    process.env.OPENCLAW_FALLBACK_TO_HEURISTIC = "false";
    vi.resetModules();

    runOpenClawModerationMock.mockRejectedValueOnce(new Error("Gateway unavailable"));

    const { selectModeration } = await import("../src/services/moderation-provider");

    await expect(
      selectModeration({
        correlationId: "corr-3",
        site: "infogleam.com",
        eventId: "evt-3",
        commentId: 12,
        content: "some comment"
      })
    ).rejects.toThrow("Gateway unavailable");
  });
});
