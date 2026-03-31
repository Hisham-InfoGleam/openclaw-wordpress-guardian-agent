# openclaw-wordpress-guardian-agent

Secure WordPress comment moderation with OpenClaw + Telegram human-in-the-loop.

## Project Goal

Build a fast, secure, and publishable portfolio project where:

1. WordPress sends signed webhook events for new comments.
2. OpenClaw moderation API classifies comments.
3. High-confidence decisions are auto-applied to WordPress.
4. Uncertain decisions are escalated to Telegram for owner approval/block.

Phase 1 focuses on a solid, runnable MVP with security-first defaults.

## Stack

- Runtime: Node.js + TypeScript
- API: Express
- Validation: zod
- Optional DB: Prisma + MariaDB (Phase 2 unless required earlier)
- Integration: WordPress REST API + Telegram Bot API

## Documentation

- Published documentation lives under `docs/public/`.
- Security and architecture updates are documented there as features evolve.

## Phase 1 Deliverables

- Signed WordPress webhook receiver (`POST /hooks/wp-comment`)
- HMAC validation + zod validation
- Moderation decision flow: `approve | block | needs_review`
- Telegram escalation for uncertain decisions
- WordPress status update via REST API + Application Passwords
- Security baseline and public runbook docs

See the detailed plan in:

- `docs/public/architecture.md`
- `docs/public/security-baseline.md`
- `docs/public/phase1-production-checklist.md`
- `docs/public/deployment-vps.md`
- `wordpress-plugin/README.md`
- `docker/local/README.md`

## Quick Start

1. Go to `automation-api/`.
2. Copy `.env.example` to `.env` and set real values.
3. Install dependencies with `npm install`.
4. Validate configuration with `npm run check:env`.
5. Start API in dev mode with `npm run dev`.
6. Configure WordPress webhook to `POST /hooks/wp-comment` with shared HMAC secret.
7. Configure Telegram bot webhook to `POST /telegram/callback`.
8. Submit test comments and verify Telegram + WordPress status updates.

## Repository    Status

Phase 1 and Phase 1.5 are runnable 
in local/dev with secure webhook flow, Telegram callback handling, OpenClaw-backed moderation provider mode with confidence-based `needs_review` routing, and WordPress action-path fallback handling for auth mismatch failures.


**Hisham Hussein Alrashdan**  
For questions or consulting inquiries: hisham@infogleam.com

[www.infogleam.com](https://infogleam.com)

