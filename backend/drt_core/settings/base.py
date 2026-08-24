import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Load env vars from repo-level .env (if present).
env_file = BASE_DIR.parent.parent / ".env"
if env_file.exists():
    for raw_line in env_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        # Allow inline comments only when preceded by a space: VALUE # comment
        value = value.strip()
        if " #" in value:
            value = value.split(" #", 1)[0].strip()
        os.environ.setdefault(key.strip(), value.strip().strip("'\""))

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY")
if not SECRET_KEY:
    # Never use in production: production replaces this via DJANGO_SECRET_KEY requirement.
    SECRET_KEY = "django-insecure-dev-only-set-DJANGO_SECRET_KEY-never-deploy-with-this"

DEBUG = os.getenv("DJANGO_DEBUG", "False") == "True"


SESSION_ENGINE = "django.contrib.sessions.backends.signed_cookies"
# Optional: make sure the cookie expires quickly
SESSION_COOKIE_AGE = 60 * 60  # 1 hour
SESSION_EXPIRE_AT_BROWSER_CLOSE = True

CORS_ALLOWED_ORIGINS = [
    "http://127.0.0.1:3000",
]
CORS_ALLOW_CREDENTIALS = True

DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]
THIRD_PARTY_APPS = [
    "rest_framework",
    "corsheaders",
    "drf_spectacular",
]
LOCAL_APPS = [
    "datastore",
    "drt",
]
INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# Required for drf-spectacular (avoids E001 on @api_view / WrappedAPIView during check --deploy).
REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    # "drt.middleware.InstanceMiddleware", 
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [os.path.join(BASE_DIR, "templates")],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

ROOT_URLCONF = "drt_core.urls"
WSGI_APPLICATION = "drt_core.wsgi.application"

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
USE_THOUSAND_SEPARATOR = True
THOUSAND_SEPARATOR = " "

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# Magic link TTL in minutes (default: 7 days)
MAGIC_LINK_TTL_MINUTES = int(os.environ.get("MAGIC_LINK_TTL_MINUTES", str(60 * 24 * 7)))

# Public sandbox/testing configuration (exposed via /drt/public-config/ when enabled)
TESTING_MODE = os.environ.get("TESTING_MODE", "false").lower() == "true"
ETHEREAL_USER = os.environ.get("ETHEREAL_USER", "")
ETHEREAL_PASS = os.environ.get("ETHEREAL_PASS", "")
OWNER_EMAIL = os.environ.get("OWNER_EMAIL", "")
