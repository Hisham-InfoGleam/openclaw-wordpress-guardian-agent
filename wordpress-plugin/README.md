# WordPress Mini-Plugin (Phase 1)

This folder contains the custom mini-plugin required for Phase 1 webhook emission.

## Install

1. Copy `openclaw-comment-webhook/` into your WordPress `wp-content/plugins/` directory.
2. Activate **OpenClaw Comment Webhook** from WordPress Admin > Plugins.
3. Go to Settings > OpenClaw Webhook.
4. Set:
   - Automation API URL: `https://<your-api-domain>/hooks/wp-comment`
   - Shared Secret: must match `WEBHOOK_SHARED_SECRET` in automation-api
5. Save settings.

## Event Sent

For each new comment (except spam/trash), plugin sends:

- `event`: `wp.comment.created`
- `eventId`: UUID
- `site`: current site host
- `comment` object with id/postId/authorName/authorUrl/content/createdAt

Request includes header `X-WP-Signature: sha256=<hmac-hex>` over raw JSON body.
