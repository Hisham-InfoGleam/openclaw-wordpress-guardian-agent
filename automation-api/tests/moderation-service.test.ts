import { afterEach, describe, expect, it, vi } from "vitest";

const sendReviewRequestMock = vi.fn(async () => undefined);
const updateWordPressCommentStatusMock = vi.fn(async () => undefined);
const selectModerationMock = vi.fn(async () => ({
  provider: "heuristic",
  moderation: {
    decision: "approve" as const,
    confidence: 0.95,
    reason: "No suspicious signals detected.",
    signals: []
  }
}));

class MockWordPressUpdateError extends Error {
  readonly status: number;
  readonly commentId: number;

  constructor(commentId: number, status: number, message: string) {
    super(message);
    this.status = status;
    this.commentId = commentId;
  }
}

vi.mock("../src/clients/telegram-client", () => ({
  sendReviewRequest: sendReviewRequestMock,
  answerTelegramCallback: vi.fn()
}));

vi.mock("../src/clients/wordpress-client", () => ({
  updateWordPressCommentStatus: updateWordPressCommentStatusMock,
  WordPressUpdateError: MockWordPressUpdateError,
  isWordPressAuthFailure: (error: unknown) =>
    error instanceof MockWordPressUpdateError && (error.status === 401 || error.status === 403)
}));

vi.mock("../src/services/moderation-provider", () => ({
  selectModeration: selectModerationMock
}));

describe("moderation-service", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("escalates to Telegram when auto-apply fails with WordPress auth error", async () => {
    updateWordPressCommentStatusMock.mockRejectedValueOnce(
      new MockWordPressUpdateError(321, 401, "WordPress update failed")
    );

    const { processWpCommentWebhook } = await import("../src/services/moderation-service");

    await processWpCommentWebhook(
      {
        event: "wp.comment.created",
        eventId: "evt-auth",
        site: "infogleam.com",
        comment: {
          id: 321,
          postId: 456,
          authorName: "Test User",
          authorUrl: null,
          content: "regular comment content",
          createdAt: "2026-02-24T10:00:00.000Z"
        }
      },
      "corr-auth"
    );

    expect(sendReviewRequestMock).toHaveBeenCalledTimes(1);
    expect(sendReviewRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        commentId: 321,
        eventId: "evt-auth",
        reason: expect.stringContaining("auto_apply_failed=wp_auth_failed")
      })
    );
  });
});