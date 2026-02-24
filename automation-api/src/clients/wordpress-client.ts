import { env } from "../config/env";

export class WordPressUpdateError extends Error {
  readonly status: number;
  readonly commentId: number;

  constructor(commentId: number, status: number, message: string) {
    super(message);
    this.name = "WordPressUpdateError";
    this.status = status;
    this.commentId = commentId;
  }
}

function toBodySnippet(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= 180) {
    return normalized;
  }
  return `${normalized.slice(0, 180)}...`;
}

export function isWordPressAuthFailure(error: unknown): error is WordPressUpdateError {
  return error instanceof WordPressUpdateError && (error.status === 401 || error.status === 403);
}

function toWpStatus(decision: "approve" | "block"): "approve" | "spam" {
  return decision === "approve" ? "approve" : "spam";
}

function getAuthorizationHeader(): string {
  const token = Buffer.from(`${env.WP_APP_USERNAME}:${env.WP_APP_PASSWORD}`).toString("base64");
  return `Basic ${token}`;
}

export async function updateWordPressCommentStatus(commentId: number, decision: "approve" | "block"): Promise<void> {
  const url = `${env.WP_BASE_URL.replace(/\/$/, "")}/wp-json/wp/v2/comments/${commentId}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthorizationHeader()
    },
    body: JSON.stringify({ status: toWpStatus(decision) })
  });

  if (!response.ok) {
    const body = await response.text();
    const snippet = toBodySnippet(body);
    throw new WordPressUpdateError(
      commentId,
      response.status,
      `WordPress update failed: status=${response.status} decision=${decision} body=${snippet}`
    );
  }
}
