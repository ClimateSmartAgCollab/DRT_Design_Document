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
1. Copy `.env.example` to `.env` at the repository root.
2. Update secrets and database credentials.
3. The same `.env` is loaded by Django directly (via `settings/base.py`) and injected into the Docker Compose dev stack via `env_file`. For production deployments, copy `.env.production.example` to `.env.production` instead.

Key variables:
- `DJANGO_SECRET_KEY`
- `DATABASE_URL` *or* `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DB_HOST`, `DB_PORT`
- `REDIS_URL` (when using Redis outside the in-memory dev defaults)
- `ETHEREAL_USER` / `ETHEREAL_PASS` for staging email testing

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


