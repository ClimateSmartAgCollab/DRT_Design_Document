# DRT (Data Request Tracker)

An end-to-end platform for data-access negotiations between requestors and dataset owners — guided questionnaires, asynchronous review, license generation, and an audit trail.

This repository is the **Data Hub** implementation of DRT. The platform itself is general-purpose: any organization or research group can deploy their own instance. Start with the [Implementation Guide](docs/IMPLEMENTATION_GUIDE.md). For the broader DRT concept, see the [DRT landing page](https://github.com/ClimateSmartAgCollab/drt-ad).

## Features

- **Guided data requests** — dataset-specific questionnaires with branching logic and inline guidance
- **Negotiation lifecycle** — owners review, request clarification, reject with rationale, or approve
- **Email workflows** — verification, reminders, approvals, and rejections sent in-request
- **License automation** — approved negotiations produce Jinja-rendered licenses, emailed to stakeholders
- **Magic-link access** — UUID email links instead of heavyweight accounts
- **Role-specific dashboards** — open negotiations, outstanding actions, historical archives
- **Analytics hooks** — activity aggregated by owner, dataset, and tags

## Tech stack

| Layer | Stack |
| --- | --- |
| Frontend | Next.js 15 (App Router), TypeScript, MUI |
| Backend | Django 5.1, Django REST Framework |
| Data | PostgreSQL (negotiation state), Redis (cache), GitHub (questionnaires, licenses, metadata) |
| Infra | Docker Compose; remote stack adds gunicorn, nginx, and host cron |

## Quick start

Assume zero context. Docker runs **Postgres, Redis, and Mailpit**. Django and Next.js run on the host. Root npm scripts use `backend/.venv` through `scripts/venv-python.js` — you do not activate the virtualenv.

**Prerequisites:** Python 3.12 or 3.13, Node.js 20+, Docker, Git.

```bash
# First time
cp .env.example .env                          # fill secrets; see Configuration
cp frontend/env.local.example frontend/.env.local
# Local API (the example file points at the remote host):
#   NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
npm run setup:backend
npm --prefix frontend install

# Every session
docker compose -f infra/docker-compose.yml up -d
npm run migrate
npm run dev
```

| Script | Purpose |
| --- | --- |
| `npm run setup:backend` | Create `backend/.venv` if missing and install `backend/requirements.txt` |
| `npm run migrate` | `manage.py migrate` via that venv |
| `npm run manage -- <cmd>` | Any other Django command (e.g. `createsuperuser`) |
| `npm run dev` | Next on **3001** and Django `runserver` on **8000** |

- Backend: <http://127.0.0.1:8000> — Django admin: <http://127.0.0.1:8000/django-admin/>
- Frontend: <http://127.0.0.1:3001>
- Mailpit inbox: <http://127.0.0.1:8025>
- Stop apps: Ctrl+C in the `npm run dev` terminal
- Stop databases: `docker compose -f infra/docker-compose.yml down`

If `npm run migrate` or `npm run dev` fails with `Backend virtualenv not found`, run `npm run setup:backend` first. If the venv was created with Python 3.14 (or anything outside 3.12–3.13), delete `backend/.venv` and rerun `setup:backend`.

Email, license generation, and cache refresh run in-request. There is no Celery.

The fully containerized stack (images, nginx, TLS) is remote only. On `drt-test` add `--profile testing` so Mailpit starts. Omit that profile on a real production host.

```bash
docker compose -f infra/docker-compose.prod.yml up -d --build
# drt-test:
# docker compose -f infra/docker-compose.prod.yml --profile testing up -d --build
```

See [`infra/README.md`](infra/README.md) and the [Implementation Guide](docs/IMPLEMENTATION_GUIDE.md) Step 9.

## Configuration

Copy [`.env.example`](.env.example) to `.env` (local) or `.env.production` (any remote host). Fill values **per host**; do not reuse secrets. Compose on remote always injects `.env.production`. Local Django (`drt_core.settings.local`) loads repo-root `.env`. Staging and production use `drt_core.settings.production`.

App behavior follows `TESTING_MODE` and `ENVIRONMENT` inside the file, not the filename.

| Variable | Purpose |
| --- | --- |
| `DJANGO_SECRET_KEY` | Django secret — unique per host |
| `POSTGRES_*` / `DB_HOST` / `DB_PORT` | Local Postgres (`DATABASE_URL` can override locally) |
| `USE_SQLITE` | `true` for SQLite-only local runs |
| `REDIS_URL` | Cache (`127.0.0.1:6380` locally) |
| `GITHUB_API_URL` / `GITHUB_TOKEN` | Datastore repo (`https://api.github.com/repos/OWNER/REPO/contents`) |
| `EMAIL_*` / `TESTING_INBOX_URL` | SMTP config; Mailpit inbox URL for dev/staging |
| `EMAIL_TIMEOUT` | SMTP hang bound in seconds (default `10`) |
| `FRONTEND_BASE_URL` | Deep links in emails |
| `TESTING_MODE` / `ENVIRONMENT` | Sandbox banner vs production; log label |
| `NEXT_PUBLIC_API_URL` | Frontend → API (`frontend/.env.local`) |

Remote hosts also need `DJANGO_ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, `POSTGRES_HOST` (not `DB_HOST`), and optional `CRON_HEALTHCHECK_*_URL`. Production settings ignore `DATABASE_URL`.

The env file is the catalog. Backend-only notes: [`backend/README.md`](backend/README.md). Production checklist: [Implementation Guide](docs/IMPLEMENTATION_GUIDE.md) Step 6.3 and Step 9.2.

## Project structure

```
backend/     Django API, models, datastore gateway, management commands
frontend/    Next.js client, theming, questionnaires
infra/       Compose files, Dockerfiles, host cron, systemd unit
scripts/     venv-python.js — root npm scripts use backend/.venv
docs/        Architecture, implementation guide, cache notes
LICENCE      EUPL 1.2
```

## Testing

```bash
npm --prefix frontend run lint
npm --prefix frontend run test
npm --prefix frontend run type-check
npm run manage -- test
```

Husky runs `npm run lint` on commit.

## Learn more

| Doc | What it covers |
| --- | --- |
| [Architecture](docs/ARCHITECTURE.md) | Environments, diagram, workflow, data model |
| [Implementation Guide](docs/IMPLEMENTATION_GUIDE.md) | Deploy your own instance — datastore, theming, production |
| [Cache architecture](docs/cache-architecture.md) | GitHub-backed cache, webhooks, failure behavior |
| [Backend](backend/README.md) · [Frontend](frontend/README.md) · [Infra](infra/README.md) | Module-level setup that differs from this README |

Support: `adc@uoguelph.ca`. Example datastore: [ClimateSmartAgCollab/DRT-DS-test](https://github.com/ClimateSmartAgCollab/DRT-DS-test).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch naming, tests, and how to propose changes.

## License

Licensed under the [European Union Public Licence v1.2](LICENCE).
