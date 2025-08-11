# drt_core\settings\local.py
from .base import *  # noqa
import os
# import dj_database_url

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")  # "development" | "staging" | "production"

# Hosts / CSRF / CORS
# ----------------------------
if ENVIRONMENT == "development":
    ALLOWED_HOSTS = ["*"]
    CSRF_TRUSTED_ORIGINS = [
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    ]
    CORS_ALLOWED_ORIGINS = [
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    ]
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False
    SESSION_COOKIE_SAMESITE = "Lax"
    CSRF_COOKIE_SAMESITE = "Lax"
else:
    # Your public hostname behind Nginx/HTTPS
    PUBLIC_HOST = "drt-test.canadacentral.cloudapp.azure.com"

    # Allow local access as well so we can run staging locally
    ALLOWED_HOSTS = [PUBLIC_HOST, "127.0.0.1", "localhost"]
    CSRF_TRUSTED_ORIGINS = [
        f"https://{PUBLIC_HOST}",
    ]

    # If your frontend is served at the same host (recommended), CORS may be unnecessary.
    # Keep it if your frontend ever calls the API cross-origin.
    CORS_ALLOWED_ORIGINS = [
        f"https://{PUBLIC_HOST}",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    ]

    CORS_ALLOW_CREDENTIALS = True

    # Secure cookies in prod
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SESSION_COOKIE_SAMESITE = "Lax"
    CSRF_COOKIE_SAMESITE = "Lax"

    # Enforce HTTPS at Django level too (can be disabled locally via env)
    from os import getenv as _getenv
    SECURE_SSL_REDIRECT = _getenv("SECURE_SSL_REDIRECT", "True") == "True"
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

    # Optional: add HSTS after you confirm HTTPS everywhere
    # SECURE_HSTS_SECONDS = 31536000
    # SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    # SECURE_HSTS_PRELOAD = True



if ENVIRONMENT == "staging":
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = "smtp.ethereal.email"
    EMAIL_PORT = 587
    EMAIL_HOST_USER = os.environ.get("ETHEREAL_USER")
    EMAIL_HOST_PASSWORD = os.environ.get("ETHEREAL_PASS")
    EMAIL_USE_TLS = True
    DEFAULT_FROM_EMAIL = "no-reply@yourapp.test"


# CORS Configuration
CORS_ALLOW_CREDENTIALS = True


FRONTEND_BASE_URL = "https://drt-test.canadacentral.cloudapp.azure.com"
# FRONTEND_BASE_URL = "http://127.0.0.1:3000"


USE_SQLITE = os.getenv("USE_SQLITE", "false").lower() == "true"

if USE_SQLITE:
    # Lightweight DB for local runs of staging
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": str(BASE_DIR / "db.sqlite3"),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql_psycopg2",
            "NAME": os.environ.get("POSTGRES_DB"),
            "USER": os.environ.get("POSTGRES_USER"),
            "PASSWORD": os.environ.get("POSTGRES_PASSWORD"),
            "HOST": os.environ.get("DB_HOST"),
            "PORT": os.environ.get("DB_PORT", "5432"),
        },
    }


# database_url = os.environ.get("DATABASE_URL")
# DATABASES["default"] = dj_database_url.parse(database_url)

REDIS_URL = os.environ.get("REDIS_URL")
if USE_SQLITE:
    # Use in-memory cache when running staging locally
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "TIMEOUT": 60 * 60 * 24,
        }
    }
else:
    if REDIS_URL is None:
        raise ValueError("REDIS_URL environment variable is not set.")
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": REDIS_URL,
            "TIMEOUT": 60 * 60 * 24,  # cache entries expire after 1 day
            "OPTIONS": {
                "CLIENT_CLASS": "django_redis.client.DefaultClient",
            },
        }
    }

# Storage, static and media
STATIC_URL = "/static/"
STATIC_ROOT = "/usr/src/static/"
MEDIA_URL = "/media/"
MEDIA_ROOT = "/usr/src/media/"
