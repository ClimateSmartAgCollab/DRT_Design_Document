import os

import dj_database_url
from celery.schedules import crontab
from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa


def _required(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise ImproperlyConfigured(f"{name} is not set")
    return value


DEBUG = False
SECRET_KEY = _required("DJANGO_SECRET_KEY")

ALLOWED_HOSTS = [host.strip() for host in _required("DJANGO_ALLOWED_HOSTS").split(",")]
CSRF_TRUSTED_ORIGINS = [
    origin.strip() for origin in _required("CSRF_TRUSTED_ORIGINS").split(",")
]
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CORS_ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]
CORS_ALLOW_CREDENTIALS = True

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_HSTS_SECONDS = int(os.environ.get("SECURE_HSTS_SECONDS", "0"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = SECURE_HSTS_SECONDS > 0
SECURE_HSTS_PRELOAD = SECURE_HSTS_SECONDS > 0

POSTGRES_DB = _required("POSTGRES_DB")
POSTGRES_USER = _required("POSTGRES_USER")
POSTGRES_PASSWORD = _required("POSTGRES_PASSWORD")
POSTGRES_HOST = _required("POSTGRES_HOST")
POSTGRES_PORT = os.environ.get("POSTGRES_PORT", "5432")
POSTGRES_SCHEMA = os.environ.get("POSTGRES_SCHEMA", "public")
if not POSTGRES_SCHEMA.isidentifier():
    raise ImproperlyConfigured("POSTGRES_SCHEMA must be a valid Python/PostgreSQL identifier (e.g. public, tenant1)")

DATABASES = {
    "default": {
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
        'OPTIONS': {
            'options': f'-c search_path={POSTGRES_SCHEMA}'
        },
        'NAME': POSTGRES_DB,
        'USER': POSTGRES_USER,
        'PASSWORD': POSTGRES_PASSWORD,
        'HOST': POSTGRES_HOST,
        'PORT': POSTGRES_PORT,
        'CONN_MAX_AGE': int(os.environ.get("POSTGRES_CONN_MAX_AGE", "600")),
    }
}

REDIS_URL = _required("REDIS_URL")
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "TIMEOUT": 60 * 60 * 24,
        "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
    }
}

CELERY_BROKER_URL = _required("CELERY_BROKER_URL")
CELERY_RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", CELERY_BROKER_URL)
CELERY_TASK_ALWAYS_EAGER = False
CELERY_TASK_IGNORE_RESULT = True
CELERY_BEAT_SCHEDULE = {
    "process-abandonment-policy": {
        "task": "drt.tasks.process_abandonment_policy_task",
        "schedule": crontab(hour=2, minute=0),
        "options": {"expires": 3600},
    },
    "prewarm-github-cache": {
        "task": "drt.tasks.refresh_data_task",
        "schedule": crontab(minute=0, hour="*/12"),
        "options": {"expires": 3600},
    },
}

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = _required("EMAIL_HOST")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
EMAIL_HOST_USER = _required("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = _required("EMAIL_HOST_PASSWORD")
EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "True") == "True"
DEFAULT_FROM_EMAIL = _required("DEFAULT_FROM_EMAIL")
EMAIL_TIMEOUT = int(os.environ.get("EMAIL_TIMEOUT", "10"))

FRONTEND_BASE_URL = _required("FRONTEND_BASE_URL")
STATIC_URL = "/static/"
STATIC_ROOT = os.environ.get("DJANGO_STATIC_ROOT", "/usr/src/static/")
MEDIA_URL = "/media/"
MEDIA_ROOT = os.environ.get("DJANGO_MEDIA_ROOT", "/usr/src/media/")
