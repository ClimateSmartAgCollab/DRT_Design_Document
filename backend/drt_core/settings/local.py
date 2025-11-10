
# drt_core\settings\local.py
from .base import *  # noqa
import os
from celery.schedules import crontab
# import dj_database_url

# "development" | "staging" | "production"
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

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

# Celery Beat Schedule
CELERY_BEAT_SCHEDULE = {
    'process-abandonment-policy': {
        'task': 'drt.tasks.process_abandonment_policy_task',
        'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
        'options': {
            'expires': 3600,  # Task expires after 1 hour if not picked up
        }
    },
}

# Magic link TTL in minutes (default: 7 days)
MAGIC_LINK_TTL_MINUTES = int(os.environ.get(
    "MAGIC_LINK_TTL_MINUTES", str(60 * 24 * 7)))


# # drt_core\settings\local.py
# from .base import *  # noqa
# import os
# import dj_database_url
# from celery.schedules import crontab
# from os import getenv as _getenv

# ENVIRONMENT = os.getenv("ENVIRONMENT", "development")  # "development" | "staging" | "production"
# print(f"++++++++ {os.environ.get("ETHEREAL_USER")} ++++++++")

# # Hosts / CSRF / CORS
# # ----------------------------
# if ENVIRONMENT == "development":
#     DEBUG = True
#     print("--------Running in development mode")
#     ALLOWED_HOSTS = ["*"]
#     CSRF_TRUSTED_ORIGINS = [
#         "http://127.0.0.1:3000",
#         "https://127.0.0.1:3000",
#     ]
#     CORS_ALLOWED_ORIGINS = [
#         "http://127.0.0.1:3000",
#         "https://127.0.0.1:3000",
#         "http://localhost:3000",
#         "https://localhost:3000",
#     ]
#     # For development, allow all origins
#     CORS_ALLOW_ALL_ORIGINS = True
#     # Dev: HTTP  same-site (localhost/127.0.0.1) -> use Lax  not secure
#     SESSION_COOKIE_SECURE = False
#     CSRF_COOKIE_SECURE = False
#     SESSION_COOKIE_SAMESITE = "Lax"
#     CSRF_COOKIE_SAMESITE = "Lax"
#     CSRF_COOKIE_HTTPONLY = False
#     # Allow credentials for cross-origin requests
#     CORS_ALLOW_CREDENTIALS = True
#     CELERY_TASK_ALWAYS_EAGER = True
#     CELERY_TASK_EAGER_PROPAGATES = True
#     CELERY_TASK_IGNORE_RESULT = True
#     CELERY_BROKER_URL = "memory://"
#     CELERY_RESULT_BACKEND = "cache+memory://"

#     # Disable Celery Beat in development (tasks run immediately)
#     CELERY_BEAT_SCHEDULE = {}

# else:
#     print(f"--------Running in {ENVIRONMENT} mode")
#     # Your public hostname behind Nginx/HTTPS
#     PUBLIC_HOST = "drt-test.canadacentral.cloudapp.azure.com"

#     # Allow local access as well so we can run staging locally
#     ALLOWED_HOSTS = [PUBLIC_HOST, "127.0.0.1", "localhost"]
#     CSRF_TRUSTED_ORIGINS = [
#         f"https://{PUBLIC_HOST}",
#         "http://127.0.0.1:3000",
#         "https://127.0.0.1:3000",
#         "http://localhost:3000",
#         "https://localhost:3000",
#     ]

#     # If your frontend is served at the same host (recommended), CORS may be unnecessary.
#     # Keep it if your frontend ever calls the API cross-origin.
#     CORS_ALLOWED_ORIGINS = [
#         f"https://{PUBLIC_HOST}",
#         "http://127.0.0.1:3000",
#         "https://127.0.0.1:3000",
#         "http://localhost:3000",
#         "https://localhost:3000",
#     ]

#     CORS_ALLOW_CREDENTIALS = True

#     # For local development, allow all origins
#     CORS_ALLOW_ALL_ORIGINS = True

#     # Celery configuration for production/staging
#     CELERY_TASK_ALWAYS_EAGER = False  # Use real Celery for production
#     CELERY_TASK_EAGER_PROPAGATES = False
#     CELERY_TASK_IGNORE_RESULT = True
#     CELERY_BROKER_URL = "redis://127.0.0.1:6379/0"
#     CELERY_RESULT_BACKEND = "redis://127.0.0.1:6379/0"

#     # Enable Celery Beat for production - automatic abandonment policy

#     CELERY_BEAT_SCHEDULE = {
#         'process-abandonment-policy': {
#             'task': 'drt.tasks.process_abandonment_policy_task',
#             'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
#             'options': {
#                 'expires': 3600,  # Task expires after 1 hour if not picked up
#             }
#         },
#     }

#     # Secure cookies in prod (configurable for local dev)
#     SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "False") == "True"
#     CSRF_COOKIE_SECURE = os.getenv("CSRF_COOKIE_SECURE", "False") == "True"
#     SESSION_COOKIE_SAMESITE = "Lax"
#     CSRF_COOKIE_SAMESITE = "Lax"

#     # Enforce HTTPS at Django level too (can be disabled locally via env)

#     SECURE_SSL_REDIRECT = _getenv("SECURE_SSL_REDIRECT", "True") == "True"
#     SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

#     # Optional: add HSTS after you confirm HTTPS everywhere
#     # SECURE_HSTS_SECONDS = 31536000
#     # SECURE_HSTS_INCLUDE_SUBDOMAINS = True
#     # SECURE_HSTS_PRELOAD = True


# # # Email Configuration
# # if ENVIRONMENT == "staging":
# # print("--------Using Ethereal email backend for staging")
# EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
# EMAIL_HOST = "smtp.ethereal.email"
# EMAIL_PORT = 587
# EMAIL_HOST_USER = os.environ.get("ETHEREAL_USER")
# EMAIL_HOST_PASSWORD = os.environ.get("ETHEREAL_PASS")
# EMAIL_USE_TLS = True
# EMAIL_TIMEOUT = 10
# DEFAULT_FROM_EMAIL = "no-reply@yourapp.test"


# # CORS Configuration
# # CORS_ALLOW_CREDENTIALS = True  # Moved to development section above


# # FRONTEND_BASE_URL = "https://drt-test.canadacentral.cloudapp.azure.com"
# FRONTEND_BASE_URL = "http://127.0.0.1:3000"


# USE_SQLITE = os.getenv("USE_SQLITE", "false").lower() == "true"

# if USE_SQLITE:
#     # Lightweight DB for local runs of staging
#     DATABASES = {
#         "default": {
#             "ENGINE": "django.db.backends.sqlite3",
#             "NAME": str(BASE_DIR / "db.sqlite3"),
#         }
#     }
# else:
#     DATABASES = {
#         "default": {
#             "ENGINE": "django.db.backends.postgresql_psycopg2",
#             "NAME": os.environ.get("POSTGRES_DB"),
#             "USER": os.environ.get("POSTGRES_USER"),
#             "PASSWORD": os.environ.get("POSTGRES_PASSWORD"),
#             "HOST": os.environ.get("DB_HOST"),
#             "PORT": os.environ.get("DB_PORT", "5432"),
#         },
#     }


# database_url = os.environ.get("DATABASE_URL")
# if database_url:
#     DATABASES["default"] = dj_database_url.parse(database_url, conn_max_age=600)


# # REDIS_URL = os.environ.get("REDIS_URL")
# # if USE_SQLITE:
# #     # Use in-memory cache when running staging locally
# #     CACHES = {
# #         "default": {
# #             "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
# #             "TIMEOUT": 60 * 60 * 24,
# #         }
# #     }
# # else:
# #     if REDIS_URL is None:
# #         raise ValueError("REDIS_URL environment variable is not set.")
# #     CACHES = {
# #         "default": {
# #             "BACKEND": "django_redis.cache.RedisCache",
# #             "LOCATION": REDIS_URL,
# #             "TIMEOUT": 60 * 60 * 24,  # cache entries expire after 1 day
# #             "OPTIONS": {
# #                 "CLIENT_CLASS": "django_redis.client.DefaultClient",
# #             },
# #         }
# #     }


# # Django cache (only if you really want Redis for caching in dev)
# REDIS_URL = "redis://127.0.0.1:6379/1"
# CACHES = {
#     "default": {
#         "BACKEND": "django_redis.cache.RedisCache",
#         "LOCATION": REDIS_URL,
#         "TIMEOUT": 60 * 60 * 24,
#         "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
#     }
# }

# # Celery broker / results
# CELERY_BROKER_URL = "redis://127.0.0.1:6379/0"
# CELERY_RESULT_BACKEND = "redis://127.0.0.1:6379/0"
# CELERY_TASK_IGNORE_RESULT = True    # or leave False if you need results

# # Production Celery Beat Schedule for automatic abandonment policy
# # This will be used when CELERY_TASK_ALWAYS_EAGER = False
# CELERY_BEAT_SCHEDULE = {
#     'process-abandonment-policy': {
#         'task': 'drt.tasks.process_abandonment_policy_task',
#         'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
#         'options': {
#             'expires': 3600,  # Task expires after 1 hour if not picked up
#         }
#     },
# }


# # Storage, static and media
# STATIC_URL = "/static/"
# STATIC_ROOT = "/usr/src/static/"
# MEDIA_URL = "/media/"
# MEDIA_ROOT = "/usr/src/media/"


# # Magic link TTL in minutes (default: 7 days)
# MAGIC_LINK_TTL_MINUTES = int(os.environ.get("MAGIC_LINK_TTL_MINUTES", str(60 * 24 * 7)))
