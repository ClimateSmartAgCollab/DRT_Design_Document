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
- **Backend**: Django REST Framework with PostgreSQL, Redis, and Celery
- **Frontend**: Next.js 14 (App Router) with TypeScript
- **Infrastructure**: Docker Compose for local development, containerized deployment for production
- **Data Storage**: GitHub repository for static assets (questionnaires, licenses, metadata)

The platform manages data access negotiations between requestors and dataset owners through a structured workflow.

---

## Prerequisites

Before starting, ensure you have:

1. **Development Environment**:
   - Python 3.9+ (for Django backend)
   - Node.js 18+ and npm (for Next.js frontend)
   - Docker and Docker Compose (recommended for local development)
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
   - `backend/` - Django API and Celery tasks
   - `frontend/` - Next.js application
   - `infra/` - Docker configuration and deployment files
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

1. **Copy the example environment file**:
   ```bash
   cd backend
   cp env.example .env
   ```

2. **Configure `.env` file** with your values:

```bash
# Django Core
DJANGO_SECRET_KEY=your-secret-key-here-generate-with-openssl-rand-hex-32
ENVIRONMENT=development
DJANGO_DEBUG=True

# Database Configuration
USE_SQLITE=false  # Set to true only for initial testing
POSTGRES_DB=drt
POSTGRES_USER=drt
POSTGRES_PASSWORD=your-secure-password
DB_HOST=postgres  # Use 'localhost' if running outside Docker
DB_PORT=5432
# Or use DATABASE_URL format:
# DATABASE_URL=postgres://drt:password@localhost:5432/drt

# Redis Configuration
REDIS_URL=redis://redis:6379/1  # Use 'redis://localhost:6379/1' if running outside Docker
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# GitHub Datastore Configuration
# Format: https://api.github.com/repos/OWNER/REPO/contents
GITHUB_API_URL=https://api.github.com/repos/your-org/your-datastore/contents
GITHUB_TOKEN=your-github-personal-access-token

# Email Configuration (see Step 7 for details)
ETHEREAL_USER=your-ethereal-user  # For development/testing
ETHEREAL_PASS=your-ethereal-pass
# For production, configure SMTP settings:
# EMAIL_HOST=smtp.example.com
# EMAIL_PORT=587
# EMAIL_USE_TLS=True
# EMAIL_HOST_USER=your-email@example.com
# EMAIL_HOST_PASSWORD=your-email-password
# DEFAULT_FROM_EMAIL=noreply@yourdomain.com

# Frontend URL (used in email links)
FRONTEND_BASE_URL=http://127.0.0.1:3000  # Change for production

# Django Management
DJANGO_MANAGE_MIGRATE=on
```

### 3.2 Generate Django Secret Key

Generate a secure secret key:
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 3.3 Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

Or using Pipenv (if available):
```bash
pipenv install
```

### 3.4 Database Migrations

Run migrations to set up the database schema:
```bash
python manage.py migrate
```

### 3.5 Create Superuser (Optional)

For Django admin access:
```bash
python manage.py createsuperuser
```

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

The `infra/docker-compose.yml` includes a PostgreSQL service. Simply start it:
```bash
cd infra
docker compose up postgres redis -d
```

### 6.2 Using External PostgreSQL

1. Create a PostgreSQL database:
   ```sql
   CREATE DATABASE drt;
   CREATE USER drt WITH PASSWORD 'your-password';
   GRANT ALL PRIVILEGES ON DATABASE drt TO drt;
   ```

2. Update `backend/.env` with connection details

3. Run migrations:
   ```bash
   python manage.py migrate
   ```

### 6.3 Initial Data Loading

After setting up the GitHub datastore, trigger initial data load:
```bash
# Via API endpoint (if available)
curl -X POST http://localhost:8000/api/datastore/load-github-data/

# Or via Django management command (if implemented)
python manage.py load_github_data
```

---

## Step 7: Email Configuration

### 7.1 Development/Testing (Ethereal)

1. Sign up at https://ethereal.email/
2. Create a new account
3. Copy username and password to `backend/.env`:
   ```bash
   ETHEREAL_USER=your-ethereal-user
   ETHEREAL_PASS=your-ethereal-pass
   ```

### 7.2 Production (SMTP)

Configure production SMTP in `backend/.env`:
```bash
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=noreply@yourdomain.com
EMAIL_HOST_PASSWORD=your-smtp-password
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
```

### 7.3 Customize Email Templates

Edit email templates in `backend/drt/templates/`:
- `email_base_template.html` - Base email layout
- `request_access.html` - Request access email
- `owner_review.html` - Owner review notification
- `otp_verification.html` - OTP verification email
- `license_odrl.xml.jinja` - License generation template

---

## Step 8: Local Development

### Option A: Docker Compose (Recommended)

1. **Start all services**:
   ```bash
   cd infra
   docker compose up --build
   ```

2. **Access services**:
   - Backend API: http://127.0.0.1:8000
   - Frontend: http://127.0.0.1:3000
   - Django Admin: http://127.0.0.1:8000/admin

3. **View logs**:
   ```bash
   docker compose logs -f
   ```

### Option B: Manual Setup

1. **Start PostgreSQL and Redis** (if not using Docker)

2. **Backend**:
   ```bash
   cd backend
   python manage.py runserver 0.0.0.0:8000
   ```

3. **Celery Worker** (in separate terminal):
   ```bash
   cd backend
   celery -A drt_core worker --loglevel=info
   ```

4. **Celery Beat** (in separate terminal):
   ```bash
   cd backend
   celery -A drt_core beat --loglevel=info
   ```

5. **Frontend** (in separate terminal):
   ```bash
   cd frontend
   npm run dev
   ```

### 8.1 Verify Installation

1. **Check backend health**:
   ```bash
   curl http://localhost:8000/api/
   ```

2. **Check frontend**:
   Open http://127.0.0.1:3000 in your browser

3. **Test GitHub datastore connection**:
   ```bash
   curl -X POST http://localhost:8000/api/datastore/load-github-data/
   ```

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

### 9.2 Production Environment Variables

Create production `.env` files with:
- Strong `DJANGO_SECRET_KEY`
- Production database credentials
- Production Redis URL
- Production email SMTP settings
- Production `FRONTEND_BASE_URL` (your domain)
- Production `NEXT_PUBLIC_API_URL`

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

### 9.4 SSL/TLS Certificates

Use Let's Encrypt with Certbot (included in docker-compose.yml) or your preferred certificate authority.

### 9.5 Database Backups

Set up regular PostgreSQL backups:
```bash
# Example backup script
pg_dump -h localhost -U drt drt > backup_$(date +%Y%m%d).sql
```

### 9.6 Monitoring & Logging

- Configure logging in Django settings
- Set up application monitoring (e.g., Sentry, DataDog)
- Monitor Celery task execution
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
- Update `backend/drt/tasks.py` for Celery task behavior

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
   python manage.py makemigrations
   ```
2. Review migration file
3. Apply migration:
   ```bash
   python manage.py migrate
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
- Consider implementing cache warming via Celery Beat

**2. Database Connection Errors**
- **Solution**: Verify `DATABASE_URL` or individual DB settings in `.env`
- Check PostgreSQL is running and accessible
- Verify network connectivity (Docker networking if using containers)

**3. Celery Tasks Not Executing**
- **Solution**: Ensure Redis is running and accessible
- Check `CELERY_BROKER_URL` and `CELERY_RESULT_BACKEND` settings
- Verify Celery worker and beat processes are running
- Check Celery logs for errors

**4. Frontend Can't Connect to Backend**
- **Solution**: Verify `NEXT_PUBLIC_API_URL` in `frontend/.env.local`
- Check CORS settings in `backend/drt_core/settings/base.py`
- Ensure backend is running and accessible

**5. Email Not Sending**
- **Solution**: Verify email configuration in `.env`
- Test SMTP connection separately
- Check Celery worker logs for email task errors
- For Ethereal, verify credentials are correct

**6. GitHub Datastore Not Loading**
- **Solution**: Verify `GITHUB_API_URL` format is correct
- Check `GITHUB_TOKEN` has appropriate permissions
- Verify repository structure matches expected format
- Check backend logs for GitHub API errors

### Debug Mode

Enable Django debug toolbar (already configured in settings):
- Ensure `DJANGO_DEBUG=True` in `.env`
- Access admin panel to view debug information

### Logging

Check logs:
- Django: `backend/drt_core/logs/drt.log`
- Celery: Check terminal output or configure file logging
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

**Last Updated**: [Current Date]
**Version**: 1.0

