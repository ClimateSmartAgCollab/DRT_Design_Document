# Backend (Django)

Django 5.1 API for negotiations, magic-link auth, license generation, and the GitHub datastore gateway. Global install, env catalog, and `npm run dev` live in the [root README](../README.md). System shape: [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md).

## Why it is separate

This package is the source of truth for negotiation state (PostgreSQL), in-request email/license work, and cache-aware fetches from GitHub (`datastore/`). The frontend is a client of this API.

## Prerequisites

- Python **3.12 or 3.13** (Django 5.1). `npm run setup:backend` prefers those versions on PATH (Windows `py` launcher included).
- PostgreSQL, or `USE_SQLITE=true` for laptop-only SQLite
- Redis (Django cache)

## Setup that differs from root

From the repository root. Creates `backend/.venv` if needed and installs `requirements.txt`. You do not activate the virtualenv afterward.

```bash
npm run setup:backend
```

Settings modules: laptop uses `drt_core.settings.local` (loads repo-root `.env`). Any remote host uses `drt_core.settings.production` (Compose injects `.env.production`). On **drt-test** set `TESTING_MODE=true` and `ENVIRONMENT=staging`; on a production host set `TESTING_MODE=false` and `ENVIRONMENT=production`.

Production settings do **not** read `DATABASE_URL` or `DB_HOST`/`DB_PORT` — they require `POSTGRES_*` including `POSTGRES_HOST`. Optional `POSTGRES_SCHEMA` (default `public`) for a shared managed database.

`backend/entrypoint.sh` (Docker) polls Postgres until it accepts connections, then runs `collectstatic` / `migrate` / `createcachetable` when `DJANGO_MANAGE_MIGRATE=on`. It then waits for Redis and runs `refresh_datastore_cache` so gunicorn starts with a warm datastore (gunicorn does not set `RUN_MAIN`). If `DJANGO_SUPERUSER_USERNAME` and `DJANGO_SUPERUSER_PASSWORD` are set, it also runs `createsuperuser --noinput`.

Env catalog and production checklist: [`.env.example`](../.env.example), [Implementation Guide](../docs/IMPLEMENTATION_GUIDE.md) Step 6.3 and Step 9.2.

## Commands

From the repository root (`scripts/venv-python.js` runs `backend/.venv`):

```bash
npm run migrate
npm run manage -- createsuperuser
npm run manage -- process_abandonment_policy
npm run manage -- refresh_datastore_cache
npm run manage -- test
npm run manage -- collectstatic
```

`npm run manage -- <args>` is the local equivalent of `python manage.py <args>`. On a remote host those commands run inside the backend container via [`infra/cron/run-job.sh`](../infra/cron/run-job.sh). Django admin is at `/django-admin/` (not `/admin/`).

Collected static files land in `static/` (gitignored). Production: the entrypoint runs `collectstatic` when `DJANGO_MANAGE_MIGRATE=on`.
