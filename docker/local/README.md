# Local WordPress Stack (Docker)

This stack is for safe local testing before Namecheap production deployment.

## What it runs

- WordPress (Apache + PHP 8.2)
- MariaDB 10.11 (MySQL-compatible)
- phpMyAdmin (optional)

The OpenClaw mini-plugin is mounted automatically from:

- `wordpress-plugin/openclaw-comment-webhook`

## Start

```powershell
cd docker/local
Copy-Item .env.example .env
# edit .env values if needed
docker compose --env-file .env up -d
```

## URLs

- WordPress: `http://localhost:8080`
- phpMyAdmin: `http://localhost:18081`

## Stop

```powershell
cd docker/local
docker compose --env-file .env down
```

## Reset data (destructive)

```powershell
cd docker/local
docker compose --env-file .env down -v
```

## Notes

- Never use production DB/API secrets in this local `.env`.
- In WordPress plugin settings, set webhook URL to your local API, usually:
  - `http://host.docker.internal:3000/hooks/wp-comment`
