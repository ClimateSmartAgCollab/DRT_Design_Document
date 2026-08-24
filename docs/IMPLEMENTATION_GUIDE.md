# DRT Implementation Guide

This guide provides step-by-step instructions for implementing your own instance of the DRT (Data Request Tracker) platform based on the DRT_Design_Document codebase.

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Step 1: Repository Setup](#step-1-repository-setup)
- [Step 2: GitHub Datastore Setup](#step-2-github-datastore-setup)
- [Step 3: Backend Configuration](#step-3-backend-configuration)
- [Step 4: Frontend Configuration](#step-4-frontend-configuration)
- [Step 5: Theming & Branding](#step-5-theming--branding)
- [Step 6: Database Setup](#step-6-database-setup)
- [Step 7: Email Configuration](#step-7-email-configuration)
- [Step 8: Local Development](#step-8-local-development)
- [Step 9: Production Deployment](#step-9-production-deployment)
- [Step 10: Customization Points](#step-10-customization-points)
- [Troubleshooting](#troubleshooting)

---

## Overview

DRT is a full-stack platform built with:
- **Backend**: Django REST Framework with PostgreSQL and Redis (cache)
- **Frontend**: Next.js 14 (App Router) with TypeScript
- **Infrastructure**: Docker Compose for local Postgres/Redis; the same remote Compose shape (gunicorn, Next, nginx) for staging and production
- **Data Storage**: GitHub repository for static assets (questionnaires, licenses, metadata)

The platform manages data access negotiations between requestors and dataset owners through a structured workflow.

**Staging is a small production, not a shared laptop.** Copy [`.env.example`](../.env.example) to `.env` (laptop) or `.env.production` (any remote host). Fill **derived** secrets per host — do not clone production keys and flip `TESTING_MODE`.

---

## Prerequisites

Before starting, ensure you have:

1. **Development Environment**:
   - Python 3.12 or 3.13 (Django 5.1; `npm run setup:backend` prefers these)
   - Node.js 18+ and npm (for Next.js frontend)
   - Docker and Docker Compose (recommended for local Postgres/Redis)
   - Git

2. **Services & Accounts**:
   - GitHub account and repository for your datastore
   - PostgreSQL database (local or cloud-hosted)
   - Redis instance (local or cloud-hosted)
   - SMTP email service (for production) or Ethereal (for development/testing)
   - Domain name (for production deployment)

3. **Knowledge**:
   - Basic understanding of Django, Next.js, and Docker
   - Familiarity with REST APIs
   - Understanding of environment variables and secrets management

---

## Step 1: Repository Setup

1. **Clone or Fork the Repository**:
   ```bash
   git clone <your-repo-url>
   cd DRT_Design_Document
   ```

2. **Review Project Structure**:
   - `backend/` - Django API
   - `frontend/` - Next.js application
   - `scripts/` - `venv-python.js` so root npm scripts use `backend/.venv`
   - `infra/` - Docker Compose, Dockerfiles, and host cron wrapper
   - `docs/` - Documentation

3. **Set Up Git** (if creating a new repository):
   ```bash
   git init
   git add .
   git commit -m "Initial DRT implementation"
   ```

---

## Step 2: GitHub Datastore Setup

DRT uses a GitHub repository as the source of truth for static assets. You need to create and configure your own datastore repository.

### 2.1 Create GitHub Datastore Repository

1. Create a new GitHub repository (public or private, depending on your needs)
2. Name it something like `your-org/DRT-datastore` or `your-org/drt-data`

### 2.2 Repository Structure

Your GitHub datastore should follow this structure:

```
your-datastore-repo/
├── owner_table.csv          # Dataset owner information
├── linktable.csv            # Links between datasets, questionnaires, and licenses
├── source_library/
│   ├── questionnaire_table.csv
│   ├── license_table.csv
│   ├── questionnaires/
│   │   ├── questionnaire_001.json
│   │   ├── questionnaire_002.json
│   │   └── ...
│   └── license/
│       ├── license_template_001.jinja
│       ├── license_template_002.jinja
│       └── ...
```

### 2.3 CSV File Formats

**owner_table.csv**:
```csv
owner_id,username,owner_email
owner_001,John Doe,john.doe@example.com
owner_002,Jane Smith,jane.smith@example.com
```

**linktable.csv**:
```csv
link,questionnaire_id,license_id,owner_id,expiry,data_label,tags,record_label
abc123,questionnaire_001,license_001,owner_001,2024-12-31,Dataset Name,"tag1,tag2",Record Label
def456,questionnaire_002,license_002,owner_002,2024-12-31,Another Dataset,"tag3",Another Label
```

**questionnaire_table.csv**:
```csv
questionnaire_SAID,questionnaire_filename
questionnaire_001,questionnaire_001.json
questionnaire_002,questionnaire_002.json
```

**license_table.csv**:
```csv
license_SAID,license_filename
license_001,license_template_001.jinja
license_002,license_template_002.jinja
```

### 2.4 Create GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate a new token with `repo` scope (or `public_repo` if using a public repository)
3. Save the token securely (you'll need it for backend configuration)

### 2.5 GitHub API URL Format

The backend expects the GitHub API URL in this format:
```
https://api.github.com/repos/OWNER/REPO/contents
```

For example:
```
https://api.github.com/repos/your-org/your-datastore/contents
```

---

## Step 3: Backend Configuration

### 3.1 Environment Variables

1. **Copy the example environment file** to the runtime file for this host (never commit the copy):
   ```bash
   # Laptop
   cp .env.example .env

   # Any remote host (drt-test and a future prod VM)
   cp .env.example .env.production
   ```

2. Fill every required value in [`.env.example`](../.env.example). Uncommented defaults are for the laptop (`127.0.0.1:5433` / `6380`, `drt_core.settings.local`). Remote hosts uncomment Compose hostnames (`postgres` / `redis`) and `EMAIL_*`, set `DJANGO_SETTINGS_MODULE=drt_core.settings.production`, and use unique secrets.

   Local Django loads **repo-root** `.env` via `settings/base.py`. Remote Compose always injects `.env.production` into the containers. On `drt-test` set `TESTING_MODE=true` and `ENVIRONMENT=staging`; on a production host set `TESTING_MODE=false` and `ENVIRONMENT=production`.

### 3.2 Install Python Dependencies

From the repository root. Creates `backend/.venv` if missing (prefers Python 3.12 or 3.13) and installs `backend/requirements.txt`. You do not activate the virtualenv afterward.

```bash
npm run setup:backend
```

### 3.3 Generate Django Secret Key

```bash
npm run manage -- shell -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 3.4 Database Migrations

Run migrations to set up the database schema:
```bash
npm run migrate
```

### 3.5 Create Superuser (Optional)

For Django admin access:
```bash
npm run manage -- createsuperuser
```

**Note**: Django admin is accessible at `/django-admin/` (not `/admin/`) to avoid conflicts with Next.js admin routes. After creating a superuser, access Django admin at:
- Local: `http://127.0.0.1:8000/django-admin/`
- Production: `https://yourdomain.com/django-admin/`

---

## Step 4: Frontend Configuration

### 4.1 Environment Variables

1. **Copy the example environment file**:
   ```bash
   cd frontend
   cp env.local.example .env.local
   ```

2. **Configure `.env.local`**:

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000  # Change for production
```

### 4.2 Install Dependencies

```bash
cd frontend
npm install
```

### 4.3 Verify Configuration

Check that `frontend/app/api/apiHelper.ts` uses the correct API base URL from environment variables.

---

## Step 5: Theming & Branding

DRT supports multi-tenant theming through theme token files.

### 5.1 Default Theme

Edit `frontend/theme/tokens.default.ts` to customize:
- Logo URL and favicon
- Footer logos (partner organizations)
- Color palette (primary, secondary, backgrounds, etc.)
- Fonts
- Button styles

### 5.2 Client-Specific Themes

Create additional theme files for different clients:
- `frontend/theme/tokens.clientA.ts`
- `frontend/theme/tokens.clientB.ts`

Example structure:
```typescript
export const clientATokens: ThemeTokens = {
  logoUrl: "/assets/your-logo.png",
  faviconUrl: "/favicon.ico",
  footerLogos: [
    {
      src: partnerLogo1,
      href: "https://partner1.com",
      alt: "Partner 1",
    },
    // ... more logos
  ],
  colors: {
    primary: "#your-primary-color",
    secondary: "#your-secondary-color",
    // ... rest of color palette
  },
  // ... other theme properties
};
```

### 5.3 Update Theme Selection Logic

Modify `frontend/app/providers.tsx` or your theme selection logic to use the appropriate theme based on:
- Subdomain
- URL parameter
- Environment variable
- User preference

### 5.4 Add Custom Assets

Place custom logos and images in:
- `frontend/app/assets/` - for images used in themes
- `frontend/public/` - for static assets accessible via URL

---

## Step 6: Database Setup

### 6.1 Using Docker Compose (Recommended)

The `infra/docker-compose.yml` includes PostgreSQL (host **5433**) and Redis (host **6380**) so they do not collide with ContextHub (5432 / 6379). Start them from the repo root:
```bash
docker compose -f infra/docker-compose.yml up -d
```

### 6.2 Using External PostgreSQL

1. Create a PostgreSQL database:
   ```sql
   CREATE DATABASE drt;
   CREATE USER drt WITH PASSWORD 'your-password';
   GRANT ALL PRIVILEGES ON DATABASE drt TO drt;
   ```

2. Update `.env` with connection details (`POSTGRES_*`, `DB_HOST`, `DB_PORT`, or `DATABASE_URL` — see Step 3.1)

3. Run migrations:
   ```bash
   npm run migrate
   ```

### 6.3 PostgreSQL Schema Support (Production)

Many managed database providers allocate one database per account rather than one database per application. DRT supports **PostgreSQL schemas** so multiple projects can share a single database while keeping their tables in separate namespaces.

In production (`drt_core.settings.production`), Django sets PostgreSQL `search_path` from the `POSTGRES_SCHEMA` environment variable. Migrations and queries then target that schema.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `POSTGRES_DB` | Yes | — | Database name |
| `POSTGRES_USER` | Yes | — | Database user |
| `POSTGRES_PASSWORD` | Yes | — | Database password |
| `POSTGRES_HOST` | Yes | — | Database host (e.g. `postgres` in Docker Compose, or your managed DB hostname) |
| `POSTGRES_PORT` | No | `5432` | Database port |
| `POSTGRES_SCHEMA` | No | `public` | PostgreSQL schema (namespace) for DRT tables |
| `POSTGRES_CONN_MAX_AGE` | No | `600` | Persistent connection lifetime in seconds |

**Single-project deployments:** leave `POSTGRES_SCHEMA=public` (the default). No extra setup is required.

**Shared-database deployments:** set a dedicated schema name (e.g. `drt_prod`) and create it before the first migrate:

```sql
CREATE SCHEMA IF NOT EXISTS drt_prod;
GRANT ALL ON SCHEMA drt_prod TO your_db_user;
```

Then in `.env.production`:

```bash
POSTGRES_SCHEMA=drt_prod
```

> **Note:** Schemas provide logical separation of tables, not full security isolation. All schemas in a database share the same connection, backup scope, and database user unless your provider configures otherwise. See the [PostgreSQL schema documentation](https://www.postgresql.org/docs/current/ddl-schemas.html) for background.

Production settings do **not** read `DATABASE_URL` or `DB_HOST`/`DB_PORT`. Copy [`.env.example`](../.env.example) to `.env.production` and uncomment the remote `POSTGRES_*` keys.

### 6.4 Initial Data Loading

After setting up the GitHub datastore, cache tables are warmed automatically on backend startup. Changes to the datastore repo trigger refresh via the GitHub webhook; host cron re-warms every 12 hours as a backstop (`infra/cron/run-job.sh cache`).

---

## Step 7: Email Configuration

### 7.1 Development/Testing (Ethereal)

1. Sign up at https://ethereal.email/
2. Create a new account
3. Copy username and password to `.env`:
   ```bash
   ETHEREAL_USER=your-ethereal-user
   ETHEREAL_PASS=your-ethereal-pass
   ```

### 7.2 Production (SMTP)

Configure SMTP in `.env.production` (sandbox on `drt-test`, real provider on production). Do not reuse staging credentials on production.
```bash
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=noreply@yourdomain.com
EMAIL_HOST_PASSWORD=your-smtp-password
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
```

### 7.3 Customize Email and License Templates

**Email content** is built in Python, not HTML files. Edit the helpers in `backend/drt/utils/email_helpers.py`:
- `get_email_base_html()` - Shared layout and styling for all emails
- `get_verification_email_html()` - Magic-link / OTP verification emails
- `get_notification_email_html()` - Owner review and requestor submission notifications
- `get_rejection_email_html()`, `get_clarification_email_html()`, etc. - Workflow-specific emails

**License templates** live in your GitHub datastore under `source_library/license/` and are referenced from `license_table.csv`. The backend fetches and caches them via `fetch_license_template()`.

The only local template file is `backend/drt/templates/license_template_fallback.jinja`, used when a GitHub license template cannot be loaded.

---

## Step 8: Local Development

Docker runs **only Postgres and Redis** (same idea as ContextHub). Django and Next.js run on the host in one terminal via `npm run dev`. Root npm scripts use `backend/.venv` through `scripts/venv-python.js`, so you do not activate the virtualenv in your shell.

1. **First time**:
   ```bash
   npm run setup:backend
   npm --prefix frontend install
   ```

   Prefer Python 3.12 or 3.13 on PATH (Django 5.1). `setup:backend` creates `backend/.venv` if missing and installs `backend/requirements.txt`. If an existing venv was created with Python 3.14, delete `backend/.venv` and rerun `setup:backend`.

2. **Every session**:
   ```bash
   docker compose -f infra/docker-compose.yml up -d
   npm run migrate
   npm run dev
   ```

   If those fail with `Backend virtualenv not found`, run `npm run setup:backend`. Other Django commands: `npm run manage -- createsuperuser`.

3. **Access**:
   - Backend API: http://127.0.0.1:8000
   - Frontend: http://127.0.0.1:3001
   - Django Admin: http://127.0.0.1:8000/django-admin
   - Next.js Admin: http://127.0.0.1:3001/admin/email-entry

Local Django settings send email and refresh cache in-request. There is no Celery. Use `infra/docker-compose.prod.yml` on `drt-test` (or a future prod host) for the full container stack (gunicorn, Next image, nginx).

### 8.1 Verify Installation

1. **Check backend health**:
   ```bash
   curl http://localhost:8000/api/
   ```

2. **Check frontend**:
   Open http://127.0.0.1:3001 in your browser

3. **Test datastore connection**:
   - Restart the backend and confirm ContextHub cache warm logs (or GitHub, if `DATASTORE_BACKEND=github`).

---

## Step 9: Production Deployment

### 9.1 Build Docker Images

1. **Backend image**:
   ```bash
   docker build -f infra/docker/backend.Dockerfile -t drt-backend:latest ./backend
   ```

2. **Frontend image**:
   ```bash
   docker build -f frontend/frontend.Dockerfile -t drt-frontend:latest ./frontend
   ```

### 9.2 Environment Variables (derived per host)

Copy [`.env.example`](../.env.example) and fill **new** secrets. Staging is not production with one flag flipped.

```bash
# Any remote host
cp .env.example .env.production
# If this host previously used .env.staging:
#   mv .env.staging .env.production && rm -f infra/.env
```

Fill every required value. Remote containers load `drt_core.settings.production`, which **fails fast** if required keys are missing.

**Required groups:**

| Group | Key variables |
| --- | --- |
| Django | `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS` |
| Database | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST` |
| Redis | `REDIS_URL` (cache only) |
| Email | `EMAIL_HOST`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL` |
| GitHub datastore | `GITHUB_API_URL`, `GITHUB_TOKEN` |
| Frontend | `FRONTEND_BASE_URL` |

**Derived-secrets checklist** (each host unique):

- `DJANGO_SECRET_KEY`
- Database password
- SMTP user/password (`EMAIL_*`; Ethereal/sandbox on staging, real provider on production)
- ContextHub API key and GitHub token / webhook secret
- Hostnames (`DJANGO_ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, `FRONTEND_BASE_URL`)
- `TESTING_MODE=true` and `ENVIRONMENT=staging` on `drt-test`; `TESTING_MODE=false` and `ENVIRONMENT=production` on a real prod host

**Database notes for production:**

- Use `POSTGRES_HOST` (not `DB_HOST`). The container entrypoint waits on `POSTGRES_HOST`/`POSTGRES_PORT` before running migrations.
- Set `POSTGRES_SCHEMA=public` unless you are sharing a managed database with other apps (see [Step 6.3](#63-postgresql-schema-support-production)).
- `DATABASE_URL` is ignored in production settings; configure `POSTGRES_*` explicitly.
- Optional: `POSTGRES_CONN_MAX_AGE` (default `600`), `CORS_ALLOWED_ORIGINS`, `SECURE_HSTS_SECONDS`.

The `infra/docker-compose.prod.yml` stack reads `../.env.production` for the backend, frontend, and Postgres services. Set `DJANGO_MANAGE_MIGRATE=on` on the backend service (already configured in compose) so migrations run on startup.

### 9.3 Reverse Proxy (Nginx)

Configure Nginx to:
- Terminate TLS/SSL (ports 80/443)
- Route `/api/*` to Django backend
- Route all other traffic to Next.js frontend
- Serve static files efficiently

Example Nginx configuration:
```nginx
upstream backend {
    server backend:8000;
}

upstream frontend {
    server frontend:3000;
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 9.4 Scheduled jobs (host cron)

Email and cache refresh run **in the request**. The two clocks (abandonment policy and datastore cache warm) run on the VM via [`infra/cron/run-job.sh`](../infra/cron/run-job.sh). Local laptops do not need cron; operators can run the same commands with `npm run manage -- process_abandonment_policy` and `npm run manage -- refresh_datastore_cache`.

```cron
# Host timezone (Azure images are usually UTC)
0 2 * * *    /path/to/repo/infra/cron/run-job.sh abandonment
0 */12 * * * /path/to/repo/infra/cron/run-job.sh cache
```

The script `docker compose exec`s into the running `backend` service (this is not a gunicorn request; Healthchecks grace should cover the whole job, not 120s). Optional Healthchecks.io URLs in `.env.production`:

```bash
CRON_HEALTHCHECK_ABANDONMENT_URL=https://hc-ping.com/your-abandonment-uuid
CRON_HEALTHCHECK_CACHE_URL=https://hc-ping.com/your-cache-uuid
```

Success pings the URL; failure pings `<url>/fail`. If a URL is unset, the script still runs the job.

After switching from Celery, remove leftover worker containers if they still exist: `docker rm -f drt-prod-celery-worker drt-prod-celery-beat`.

### 9.5 SSL/TLS Certificates

Use Let's Encrypt with Certbot (included in docker-compose.yml) or your preferred certificate authority.

### 9.6 Database Backups

Set up regular PostgreSQL backups:
```bash
# Example backup script
pg_dump -h localhost -U drt drt > backup_$(date +%Y%m%d).sql
```

### 9.7 Monitoring & Logging

- Configure logging in Django settings
- Set up application monitoring (e.g., Sentry, DataDog)
- Watch Healthchecks.io for missed/failed cron pings
- Track API performance metrics

---

## Step 10: Customization Points

### 10.1 Business Logic Customization

**Negotiation States** (`backend/drt/models.py`):
- Modify `STATE_CHOICES` in `Negotiation` model
- Update state transition logic in `backend/drt/services/negotiation.py`

**Workflow Customization**:
- Edit `backend/drt/views/questionnaire.py` for questionnaire handling
- Modify `backend/drt/services/license.py` for license generation logic
- Update `backend/drt/tasks.py` for email and cache-refresh helpers

### 10.2 API Customization

**Add Custom Endpoints**:
- Create new views in `backend/drt/views/`
- Register URLs in `backend/drt/urls.py`
- Add API documentation using DRF Spectacular

**Modify Existing Endpoints**:
- Review `backend/drt/views/questionnaire.py`
- Review `backend/drt/views/auth.py`
- Review `backend/drt/views/stats.py`

### 10.3 Frontend Customization

**Add New Pages**:
- Create new routes in `frontend/app/`
- Follow Next.js App Router conventions

**Modify Components**:
- Edit components in `frontend/app/components/`
- Update shared utilities in `frontend/app/api/apiHelper.ts`

**Customize Workflows**:
- Modify requestor flow in `frontend/app/negotiation/(requestor)/`
- Modify owner flow in `frontend/app/negotiation/owner/`

### 10.4 Data Model Extensions

**Add Custom Fields**:
1. Create migration:
   ```bash
   npm run manage -- makemigrations
   ```
2. Review migration file
3. Apply migration:
   ```bash
   npm run migrate
   ```

**Add New Models**:
- Define in `backend/drt/models.py`
- Register in `backend/drt/admin.py` (if needed)
- Create migrations and apply

### 10.5 License Template Customization

1. Create Jinja templates in your GitHub datastore: `source_library/license/`
2. Reference templates in `license_table.csv`
3. Customize template rendering in `backend/drt/services/license.py`

---

## Troubleshooting

### Common Issues

**1. GitHub API Rate Limiting**
- **Solution**: Ensure Redis caching is working. Check cache TTL settings in `backend/datastore/views.py`
- Use GitHub Personal Access Token with appropriate rate limits
- Consider running `npm run manage -- refresh_datastore_cache` locally (or host cron `run-job.sh cache`)

**2. Database Connection Errors**
- **Local development:** Verify `POSTGRES_*`, `DB_HOST`, `DB_PORT`, or `DATABASE_URL` in `.env` (see Step 3.1). Local settings are in `drt_core.settings.local`.
- **Production:** Verify `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, and `POSTGRES_PORT` in `.env.production`. Production does not use `DATABASE_URL` or `DB_HOST`.
- **Shared database / custom schema:** Ensure the schema exists (`CREATE SCHEMA ...`) and `POSTGRES_SCHEMA` matches before running migrations.
- Check PostgreSQL is running and accessible; verify network connectivity (Docker networking if using containers).

**3. Cron jobs not running (remote)**
- Confirm crontab entries point at `infra/cron/run-job.sh`
- Confirm the backend container is up: `docker compose -f infra/docker-compose.prod.yml ps`
- Run the script by hand and check its exit code
- If Healthchecks.io URLs are set, a miss or `/fail` ping means the job did not complete

**4. Frontend Can't Connect to Backend**
- **Solution**: Verify `NEXT_PUBLIC_API_URL` in `frontend/.env.local`
- Check CORS settings in `backend/drt_core/settings/base.py`
- Ensure backend is running and accessible

**5. Email Not Sending**
- **Solution**: Verify email configuration in `.env`
- Test SMTP connection separately
- Check Django logs for SMTP errors (`EMAIL_TIMEOUT` defaults to 10 seconds)
- For Ethereal, verify credentials are correct

**6. GitHub Datastore Not Loading**
- **Solution**: Verify `GITHUB_API_URL` format is correct
- Check `GITHUB_TOKEN` has appropriate permissions
- Verify repository structure matches expected format
- Check backend logs for GitHub API errors

**7. `Backend virtualenv not found` or `ModuleNotFoundError`**
- Run `npm run setup:backend` from the repository root (creates `backend/.venv` and installs requirements)
- Do not activate the venv; `npm run migrate`, `npm run dev`, and `npm run manage` call it through `scripts/venv-python.js`
- If the venv was created with Python 3.14, delete `backend/.venv` and rerun `setup:backend` (Django 5.1 is tested on 3.12–3.13)
- Do not run `python backend/manage.py` with system Python — that interpreter will not have project dependencies

### Debug Mode

Enable Django debug toolbar (already configured in settings):
- Ensure `DJANGO_DEBUG=True` in `.env`
- Access admin panel to view debug information

### Logging

Check logs:
- Django: `backend/drt_core/logs/drt.log` (or container logs: `docker compose -f infra/docker-compose.prod.yml logs backend`)
- Frontend: Browser console and Next.js terminal output

---

## Next Steps

After completing the basic setup:

1. **Customize Branding**: Update logos, colors, and theme tokens
2. **Create Questionnaires**: Design JSON schema questionnaires for your datasets
3. **Configure License Templates**: Create Jinja templates for license generation
4. **Set Up Owners**: Populate `owner_table.csv` with dataset owner information
5. **Test Workflow**: Complete end-to-end test of requestor and owner workflows
6. **Set Up Monitoring**: Configure logging, error tracking, and performance monitoring
7. **Document Customizations**: Document any customizations you've made for future reference

---

## Additional Resources

- **DRT Landing Page**: https://github.com/ClimateSmartAgCollab/DRT_ad
- **Architecture Documentation**: See `docs/cache-architecture.md` for detailed caching architecture
- **Support**: Contact `adc@uoguelph.ca` for questions or partnership inquiries

---

## Contributing Back

If you've made improvements or customizations that could benefit others:
1. Document your changes
2. Consider contributing back to the main repository
3. Share your implementation experience with the community

---

**Version**: 1.0

