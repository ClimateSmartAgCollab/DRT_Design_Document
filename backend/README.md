# Backend (Django)

## Prerequisites
- Python 3.12+
- PostgreSQL (or set `USE_SQLITE=true` for local SQLite runs)
- Redis (for Celery in non-eager modes)

## Installation
```bash
pip install -r requirements.txt
# or, if you prefer pipenv
pipenv install --dev
```

## Environment

1. Copy `.env.example` to `.env` at the repository root for **local development**.
2. Copy `.env.production.example` to `.env.production` for **production** deployments.
3. The same `.env` is loaded by Django directly (via `settings/base.py`) and injected into the Docker Compose dev stack via `env_file`.

### Local development (`drt_core.settings.local`)

Key variables in `.env`:

- `DJANGO_SECRET_KEY`
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DB_HOST`, `DB_PORT`
- `DATABASE_URL` (optional — overrides the individual Postgres settings when set)
- `USE_SQLITE=true` for SQLite-only runs without Postgres
- `REDIS_URL` (when using Redis outside the in-memory dev defaults)
- `ETHEREAL_USER` / `ETHEREAL_PASS` for staging email testing

### Production (`drt_core.settings.production`)

Key variables in `.env.production`:

- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`
- `POSTGRES_SCHEMA` (default `public`; use a dedicated schema when sharing a managed database)
- `POSTGRES_CONN_MAX_AGE` (default `600`)
- `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`
- `REDIS_URL`, `CELERY_BROKER_URL`
- `EMAIL_*` (production SMTP — not `ETHEREAL_*`)

Production does **not** read `DATABASE_URL` or `DB_HOST`/`DB_PORT`. The container entrypoint waits on `POSTGRES_HOST` before migrations.

See [docs/IMPLEMENTATION_GUIDE.md](../docs/IMPLEMENTATION_GUIDE.md) Step 6.3 and Step 9.2 for schema support and the full production checklist.

## Common Commands
```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000
celery -A drt_core worker --loglevel=info
celery -A drt_core beat --loglevel=info
```

## Tests
```bash
python manage.py test
```

## Static Assets
- Collected files land in `static/` (ignored by git). Run `python manage.py collectstatic` before production deployments.
