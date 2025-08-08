# drt_core\settings\local.py
from .base import *  # noqa: F403, F401
import os
# import dj_database_url

print("▶︎ USING local.py; ENVIRONMENT =", os.getenv("ENVIRONMENT"))
print("▶︎ SMTP USER =", os.getenv("ETHEREAL_USER"))
print("▶︎ frontend base url =", os.getenv("FRONTEND_BASE_URL"))


# We open everything on local mode
ALLOWED_HOSTS = ["*"]
CSRF_TRUSTED_ORIGINS = ["http://*"]

# during local dev over HTTP, cookies must NOT be "secure-only"
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"

# explicitly trust your Next.js origin(s)
CSRF_TRUSTED_ORIGINS = [
    "http://127.0.0.1:3000",
    "http://localhost:3000",
]

# allow the sessionid cookie in cross-site requests
# SESSION_COOKIE_SAMESITE = "None"
# SESSION_COOKIE_SECURE = True

# # also do the same for the CSRF token
# CSRF_COOKIE_SAMESITE = "None"
# CSRF_COOKIE_SECURE = True



ENVIRONMENT = os.environ.get('ENVIRONMENT', default='development')

if ENVIRONMENT == "staging":
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = "smtp.ethereal.email"
    EMAIL_PORT = 587
    EMAIL_HOST_USER = os.environ.get("ETHEREAL_USER")
    EMAIL_HOST_PASSWORD = os.environ.get("ETHEREAL_PASS")
    EMAIL_USE_TLS = True
    DEFAULT_FROM_EMAIL = "no-reply@yourapp.test"


CORS_ORIGIN_ALLOW_ALL = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    "https://drt-test.canadacentral.cloudapp.azure.com",
    "https://drt-test.canadacentral.cloudapp.azure.com:80",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
FRONTEND_BASE_URL = "https://drt-test.canadacentral.cloudapp.azure.com"
# FRONTEND_BASE_URL = "http://127.0.0.1:3000"

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
