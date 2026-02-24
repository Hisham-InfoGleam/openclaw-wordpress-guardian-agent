# Security Baseline (Phase 1)

## Required Controls

- HTTPS-only for all inbound and outbound traffic.
- HMAC webhook signature verification using shared secret.
- Reject missing/invalid signatures with `401`.
- Verify Telegram callback secret header (`x-telegram-bot-api-secret-token`).
- If using OpenClaw moderation provider, authenticate to gateway with token over trusted network paths.
- Validate all external payloads with zod.
- Use dedicated WordPress user + Application Password with minimum needed privileges.
- Keep secrets in server environment only; never in frontend or public docs.
- Redact sensitive fields in logs.
- Add basic rate limiting to webhook endpoint.
- Run pre-commit secret scanning with gitleaks before every commit.

## Secret Inventory

- `WEBHOOK_SHARED_SECRET`
- `WP_APP_USERNAME`
- `WP_APP_PASSWORD`
- `WP_BASE_URL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `TELEGRAM_WEBHOOK_SECRET`
- `OPENCLAW_GATEWAY_TOKEN` (required when gateway auth is enabled)

## Logging Rules

- Log correlation ID, decision, and status only.
- Never log full comment bodies in error logs by default.
- Never log secrets, auth headers, or tokens.

## Deployment Rules

- Rotate Application Password and webhook secret on schedule.
- On WordPress `401/403` update failures, treat as auth mismatch first and rotate the Application Password before broader debugging.
- Disable unused ports and services on VPS.
- Keep OS packages updated.
- Restrict SSH and use key-based auth.
- Keep OpenClaw gateway bound to loopback/tailnet and avoid exposing it publicly without strict auth.

## WordPress Action-Path Hardening

- Use a dedicated Application Password per environment (dev/staging/prod), never shared across sites.
- Keep `WP_BASE_URL`, `WP_APP_USERNAME`, and `WP_APP_PASSWORD` updated as a single unit.
- If auto-apply fails, require manual review fallback and alerting so moderation flow does not silently drop decisions.

## Developer Guardrails

- Repo root includes `.pre-commit-config.yaml` with a pinned gitleaks hook.
- Install and enable once per clone:
	- `pip install pre-commit`
	- `pre-commit install`
- Optional manual scan before push: `pre-commit run gitleaks --all-files`.
