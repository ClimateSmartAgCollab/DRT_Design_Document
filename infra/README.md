# Infrastructure

Compose files, Dockerfiles, host cron, and the systemd unit for DRT. Local development still runs Django and Next.js **on the host**; Docker is only for data stores. How the pieces fit together: [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md). Full remote checklist: [Implementation Guide](../docs/IMPLEMENTATION_GUIDE.md) Step 9.

## Compose files

| File | Where | What runs |
| --- | --- | --- |
| `docker-compose.yml` | Laptop | Postgres 13 (host **5433**) and Redis 7 (host **6380**) |
| `docker-compose.prod.yml` | `drt-test` and a future prod host | gunicorn backend, Next.js, nginx, Postgres, Redis |

Ports 5433 / 6380 avoid colliding with ContextHub (5432 / 6379) on the same machine.

```bash
# Local datastores
docker compose -f infra/docker-compose.yml up -d

# Remote app stack (from repo root; requires .env.production)
docker compose -f infra/docker-compose.prod.yml up -d --build
```

Remote Compose always injects `../.env.production`. Staging vs production is values inside that file (`TESTING_MODE`, `ENVIRONMENT`, real vs sandbox SMTP) — not a different Compose file.

## Images

- Backend: `infra/docker/backend.Dockerfile` (context `backend/`). Entrypoint waits for Postgres, then optionally `collectstatic` / `migrate` / `createcachetable` when `DJANGO_MANAGE_MIGRATE=on`, waits for Redis, and runs `refresh_datastore_cache` before gunicorn.
- Frontend: `frontend/frontend.Dockerfile` (`npm run build`, then `npm start` on port 3000).

## Cron (remote only)

`cron/run-job.sh` runs a Django management command **inside** the backend container:

| Job | Schedule (host crontab) | Command |
| --- | --- | --- |
| `abandonment` | `0 2 * * *` | `process_abandonment_policy` |
| `cache` | `0 */12 * * *` | `refresh_datastore_cache` |

Optional Healthchecks.io URLs: `CRON_HEALTHCHECK_ABANDONMENT_URL` and `CRON_HEALTHCHECK_CACHE_URL` in `.env.production` (pings `/fail` on non-zero exit). Local has no cron; email and cache refresh run in-request.

## Nginx and systemd

- `nginx/snippets/ssl-params.conf` — TLS settings used by the nginx service in `docker-compose.prod.yml`.
- `systemd/drt-docker-compose.service` — oneshot unit that `up -d` / `stop` the prod stack. Edit `User=` and `WorkingDirectory=` for the deploy host. Use `up -d` on boot; run `--build` yourself when deploying code.

Global install, contributing, and license: [root README](../README.md).
