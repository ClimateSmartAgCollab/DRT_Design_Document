from .base import *  # noqa: F403, F401
import os

DEBUG = os.environ.get("DJANGO_DEBUG", "False") == "True"

# We open everything on local mode
ALLOWED_HOSTS = ["*"]
CSRF_COOKIE_SAMESITE = "None"
CSRF_COOKIE_SECURE = True
CSRF_TRUSTED_ORIGINS = ["http://*"]

EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend' # in console for now
DEFAULT_FROM_EMAIL = 'sanavisetayesh@gmail.com'


CORS_ORIGIN_ALLOW_ALL = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',  # Frontend origin
]
FRONTEND_BASE_URL = "http://localhost:3000" 

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

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": f"redis://{os.environ.get('REDIS_HOST')}:{os.environ.get('REDIS_PORT')}",  
        'TIMEOUT': 86400, #cache for one day
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
