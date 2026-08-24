# Backend (Django)

## Prerequisites
- Python **3.12 or 3.13** (Django 5.1). `npm run setup:backend` prefers those versions on PATH (Windows `py` launcher included).
- PostgreSQL (or set `USE_SQLITE=true` for local SQLite runs)
- Redis (Django cache)

## Installation

From the repository root. Creates `backend/.venv` if needed and installs this file's requirements. You do not need to activate the virtualenv afterward.

```bash
npm run setup:backend
```

## Environment

One catalog: copy [`.env.example`](../.env.example) once per host, then fill values. Do not reuse SMTP, database, ContextHub, GitHub, or `DJANGO_SECRET_KEY` across hosts.

1. **Laptop:** copy `.env.example` to `.env` at the repository root. Django (`settings/base.py`) loads that file. Settings module: `drt_core.settings.local`.
2. **Any remote host:** copy `.env.example` to `.env.production`. Compose always injects that file. Settings module: `drt_core.settings.production`. On **drt-test** set `TESTING_MODE=true` and `ENVIRONMENT=staging`; on a **production** host set `TESTING_MODE=false` and `ENVIRONMENT=production`.

App behavior follows `TESTING_MODE` and `ENVIRONMENT` inside the file, not the filename.

### Local development (`drt_core.settings.local`)

Key variables in `.env`:

- `DJANGO_SECRET_KEY`
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DB_HOST`, `DB_PORT`
- `DATABASE_URL` (optional — overrides the individual Postgres settings when set)
- `USE_SQLITE=true` for SQLite-only runs without Postgres
- `REDIS_URL` (cache; local Compose publishes Redis on host port 6380)
- `ETHEREAL_USER` / `ETHEREAL_PASS` for sandbox email
- `EMAIL_TIMEOUT` (default `10`; keep short so a hung SMTP call cannot occupy a worker for gunicorn’s 120s timeout)
- `TESTING_MODE`, `ENVIRONMENT`

### Production / staging (`drt_core.settings.production`)

Key variables in `.env.production`:

- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`
- `POSTGRES_SCHEMA` (default `public`; use a dedicated schema when sharing a managed database)
- `POSTGRES_CONN_MAX_AGE` (default `600`)
- `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`
- `REDIS_URL` (cache only)
- `EMAIL_*` (SMTP — not `ETHEREAL_*`)
- Optional: `CRON_HEALTHCHECK_ABANDONMENT_URL`, `CRON_HEALTHCHECK_CACHE_URL`

Production settings do **not** read `DATABASE_URL` or `DB_HOST`/`DB_PORT`.

### Container entrypoint

`backend/entrypoint.sh` runs before the app in Docker. It polls `POSTGRES_HOST`/`POSTGRES_PORT` until Postgres accepts connections (Compose `depends_on` does not guarantee readiness). When `DJANGO_MANAGE_MIGRATE=on`, it runs `collectstatic`, `migrate`, and `createcachetable`. If `DJANGO_SUPERUSER_USERNAME` and `DJANGO_SUPERUSER_PASSWORD` are set, it also runs `createsuperuser --noinput` — useful for first deploy without shell access; see commented examples in `.env.example`.

See [docs/IMPLEMENTATION_GUIDE.md](../docs/IMPLEMENTATION_GUIDE.md) Step 6.3 and Step 9.2 for schema support and the full production checklist.

## Common Commands

From the repository root (`scripts/venv-python.js` runs `backend/.venv` — do not activate it):

```bash
npm run migrate
npm run manage -- createsuperuser
npm run dev
npm run manage -- process_abandonment_policy
npm run manage -- refresh_datastore_cache
```

`npm run manage -- <args>` is the local equivalent of `python manage.py <args>`. On a remote host those commands run inside the backend container via `infra/cron/run-job.sh`.

## Tests
```bash
npm run manage -- test
```

## Static Assets
- Collected files land in `static/` (ignored by git). Local: `npm run manage -- collectstatic`. Production: the backend entrypoint runs `collectstatic` when `DJANGO_MANAGE_MIGRATE=on`.
