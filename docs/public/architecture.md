# Architecture Overview

## Flow

1. Visitor posts comment on WordPress.
2. WordPress mini-plugin sends HTTPS webhook to OpenClaw API.
3. OpenClaw validates signature + payload.
4. Moderation logic returns decision and confidence.
5. If confident, OpenClaw updates comment status in WordPress.
6. If uncertain, OpenClaw asks owner in Telegram and applies response.

## Components

- `wordpress-plugin/` (implemented in Phase 1)
  - Trigger on comment creation
  - Send minimal payload + HMAC signature

- `automation-api/` (implemented in Phase 1, extended in Phase 1.5)
  - Express routes: webhook intake, Telegram callback
  - zod schema validation
  - Correlation ID middleware and centralized error handling
  - Basic in-memory rate limiting for webhook ingress
  - moderation provider switch: `heuristic | openclaw`
  - OpenClaw gateway (OpenAI-compatible API) integration with heuristic fallback
  - skill modules for moderation and action execution
  - WordPress REST API client

- Telegram Bot Integration (implemented in Phase 1)
  - Owner notification for uncertain decisions
  - Inline action callback handling

## Implemented API Endpoints

- `GET /health` returns `{ status: "ok" }`
- `POST /hooks/wp-comment`
  - Requires `x-wp-signature` HMAC SHA-256 header
  - Validates payload with zod
  - Returns `202` quickly after validation and processes asynchronously
  - Uses configured moderation provider (`MODERATION_PROVIDER`)
  - In `openclaw` mode, low-confidence `approve|block` results are downgraded to `needs_review` using `AUTO_APPROVE_THRESHOLD` and `AUTO_BLOCK_THRESHOLD`
  - If OpenClaw provider call fails and `OPENCLAW_FALLBACK_TO_HEURISTIC=true`, route falls back to heuristic moderation
- `POST /telegram/callback`
  - Requires `x-telegram-bot-api-secret-token`
  - Validates Telegram callback payload with zod
  - Applies manual `approve|block` decision to WordPress comment

## Data Contract (Draft)

Webhook payload:

```json
{
  "event": "wp.comment.created",
  "eventId": "uuid",
  "site": "example-site.com",
  "comment": {
    "id": 123,
    "postId": 456,
    "authorName": "string",
    "authorUrl": "string|null",
    "content": "string",
    "createdAt": "iso-8601"
  }
}
```

Decision output contract:

```json
{
  "decision": "approve|block|needs_review",
  "confidence": 0.0,
  "reason": "short explanation",
  "signals": ["signal-a", "signal-b"]
}
```

## Phase Evolution

- Phase 1: stateless processing + Telegram loop
- Phase 1.5: OpenClaw-backed moderation provider with fallback to heuristic mode
- Phase 2: add Prisma/MariaDB for audit trail and replay
