# VPS Deployment Guide (Phase 1)

This guide deploys `automation-api` to a Linux VPS behind HTTPS.

## 1) Server Prerequisites

- Ubuntu/Debian VPS with SSH key auth.
- Node.js 20+ installed.
- Nginx or Caddy installed for TLS termination.
- Domain DNS pointed to VPS.

## 2) Deploy Application

```bash
git clone <your-repo-url>
cd openclaw-wordpress-guardian-agent/automation-api
npm install
npm run build
```

Create `.env` with production values:

- `NODE_ENV=production`
- `PORT=3000`
- `WEBHOOK_SHARED_SECRET=<strong-random-secret>`
- `WP_BASE_URL=https://your-wordpress-site.com`
- `WP_APP_USERNAME=<dedicated-wp-api-user>`
- `WP_APP_PASSWORD=<wp-app-password>`
- `TELEGRAM_BOT_TOKEN=<telegram-bot-token>`
- `TELEGRAM_CHAT_ID=<your-chat-id>`
- `TELEGRAM_WEBHOOK_SECRET=<strong-random-secret>`
- `MODERATION_PROVIDER=heuristic` (or `openclaw` for Phase 1.5)
- `OPENCLAW_BASE_URL=http://127.0.0.1:18789`
- `OPENCLAW_GATEWAY_TOKEN=<gateway-token-if-enabled>`
- `OPENCLAW_MODEL=<openclaw-model-id>`
- `OPENCLAW_TIMEOUT_MS=15000`
- `OPENCLAW_FALLBACK_TO_HEURISTIC=true`
- `AUTO_APPROVE_THRESHOLD=0.8`
- `AUTO_BLOCK_THRESHOLD=0.95`

Validate environment before restart:

```bash
cd /opt/openclaw-wordpress-guardian-agent/automation-api
npm run check:env
```

## 3) Process Manager (systemd)

Create `/etc/systemd/system/openclaw-guardian.service`:

```ini
[Unit]
Description=OpenClaw WordPress Guardian API
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/openclaw-wordpress-guardian-agent/automation-api
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=5
User=www-data
Environment=NODE_ENV=production
EnvironmentFile=/opt/openclaw-wordpress-guardian-agent/automation-api/.env

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable openclaw-guardian
sudo systemctl restart openclaw-guardian
sudo systemctl status openclaw-guardian
```

Post-restart quick checks:

```bash
sudo systemctl is-active openclaw-guardian
curl -fsS https://api.yourdomain.com/health
journalctl -u openclaw-guardian -n 50 --no-pager
```

## 4) Reverse Proxy + HTTPS (Nginx)

Map `https://api.yourdomain.com` to `http://127.0.0.1:3000`.
Enable TLS (Let’s Encrypt/certbot).
Only expose 80/443 publicly; keep 3000 private.

## 5) External Integrations

### WordPress

- Install plugin from `wordpress-plugin/openclaw-comment-webhook/`.
- Configure plugin endpoint as `https://api.yourdomain.com/hooks/wp-comment`.
- Set shared secret equal to `WEBHOOK_SHARED_SECRET`.

### Telegram

Set bot webhook (replace values):

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://api.yourdomain.com/telegram/callback","secret_token":"<TELEGRAM_WEBHOOK_SECRET>"}'
```

Notes:

- Telegram `callback_data` has a strict 64-byte limit.
- Review buttons use a compact payload format to stay within this limit.
- `/telegram/callback` accepts both compact and legacy payload formats for compatibility.

## 6) Production Verification

- `GET /health` returns 200.
- Invalid `x-wp-signature` returns 401.
- Valid WP webhook returns 202 quickly.
- `needs_review` sends Telegram action buttons.
- Telegram callbacks require valid `x-telegram-bot-api-secret-token`.
- Approve/block action updates WordPress comment status.

## 7) Phase 1.5 OpenClaw Decision Mode

If you want customer-visible OpenClaw decision making:

1. Keep OpenClaw gateway running on VPS.
2. Set `MODERATION_PROVIDER=openclaw` in `automation-api`.
3. Configure `OPENCLAW_BASE_URL` and `OPENCLAW_GATEWAY_TOKEN`.
4. Keep `OPENCLAW_FALLBACK_TO_HEURISTIC=true` for resilience.

Decision routing notes:

- `AUTO_APPROVE_THRESHOLD` and `AUTO_BLOCK_THRESHOLD` also govern OpenClaw auto-apply confidence gates.
- If OpenClaw returns `approve|block` below threshold, API downgrades to `needs_review` and sends Telegram review.
- If OpenClaw request fails:
  - with fallback enabled: API uses heuristic moderation;
  - with fallback disabled: webhook async processing logs failure and requires operator action.
