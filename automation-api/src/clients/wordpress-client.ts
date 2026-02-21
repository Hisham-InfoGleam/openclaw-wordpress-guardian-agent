import { env } from "../config/env";

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
    throw new Error(`WordPress update failed: ${response.status} ${body}`);
  }
}
