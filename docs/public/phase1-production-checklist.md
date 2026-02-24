# Phase 1 Production Readiness Checklist

Use this checklist to move from the current runnable API to a production-ready deployment.

## A) Infrastructure (VPS)

- [ ] Provision VPS with Node.js 20+ and HTTPS reverse proxy (Nginx/Caddy).
- [ ] Expose only HTTPS (443); close direct app port from public internet.
- [ ] Run app with a process manager (systemd or PM2) and auto-restart enabled.
- [ ] Configure firewall, SSH key-only access, and basic fail2ban/rate controls.

## B) Application Configuration

Set production values in server `.env` (never commit real secrets):

- [ ] `NODE_ENV=production`
- [ ] `PORT`
- [ ] `WEBHOOK_SHARED_SECRET`
- [ ] `WP_BASE_URL`
- [ ] `WP_APP_USERNAME`
- [ ] `WP_APP_PASSWORD`
- [ ] `TELEGRAM_BOT_TOKEN`
- [ ] `TELEGRAM_CHAT_ID`
- [ ] `AUTO_APPROVE_THRESHOLD`
- [ ] `AUTO_BLOCK_THRESHOLD`
- [ ] `TELEGRAM_WEBHOOK_SECRET`

## C) WordPress Integration

- [ ] Create dedicated WordPress API user with minimum needed privileges.
- [ ] Generate Application Password for that user.
- [ ] Install/configure WordPress webhook sender (mini-plugin/custom hook).
- [ ] Send signed events to `POST /hooks/wp-comment` using HMAC SHA-256 (`x-wp-signature`).
- [ ] Validate payload shape matches documented contract in architecture doc.

## D) Telegram Integration

- [ ] Create Telegram bot and secure token storage.
- [ ] Set Telegram webhook to `POST /telegram/callback` on your API domain.
- [ ] Restrict callback endpoint by secret header/token verification.
- [ ] Verify callback payload mapping to `approve|block` decisions.

## E) Runtime Verification

- [ ] Health check: `GET /health` returns 200.
- [ ] Invalid WP signature returns 401.
- [ ] Valid WP event returns 202 quickly.
- [ ] Auto-approved/blocked comments update WordPress correctly.
- [ ] `needs_review` sends Telegram message with action buttons.
- [ ] Telegram action updates WordPress comment status.

## E.1) WordPress 401/403 Troubleshooting (Auth Mismatch)

- [ ] Confirm `WP_BASE_URL` points to the same WordPress instance receiving webhook events.
- [ ] Verify `WP_APP_USERNAME` belongs to an active WordPress user with comment moderation privileges.
- [ ] Regenerate `WP_APP_PASSWORD` and update server environment if any credential drift is suspected.
- [ ] Restart API process after env updates and run `npm run check:env`.
- [ ] Re-test one Telegram callback and one auto decision path to confirm status updates succeed.

## F) Security and Release Gates

- [ ] `npm audit` reports no known vulnerabilities.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] Pre-commit gitleaks hook is installed and active.
- [ ] Final manual check confirms no real secrets in tracked files.
