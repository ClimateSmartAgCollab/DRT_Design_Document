from .base import *  # noqa: F403, F401
import os
import dj_database_url

DEBUG = os.environ.get("DJANGO_DEBUG", "True") == "True"
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


database_url = os.environ.get("DATABASE_URL")
DATABASES["default"] = dj_database_url.parse(database_url)

REDIS_URL = os.environ["REDIS_URL"]
if REDIS_URL is None:
    raise ValueError("REDIS_URL environment variable is not set.")

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
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



# from .base import * 

# DEBUG = "True"
# # We open everything on local mode
# ALLOWED_HOSTS = ["*"]
# CSRF_COOKIE_SAMESITE = "None"
# CSRF_COOKIE_SECURE = True
# CSRF_TRUSTED_ORIGINS = ["http://*"]

# EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend' # in console for now
# DEFAULT_FROM_EMAIL = 'sanavisetayesh@gmail.com'


# CORS_ORIGIN_ALLOW_ALL = True
# CORS_ALLOW_CREDENTIALS = True
# CORS_ALLOWED_ORIGINS = [
#     'http://localhost:3000',  # Frontend origin
# ]
# FRONTEND_BASE_URL = "http://localhost:3000" 


# DATABASES = {
#     "default": {
#         "ENGINE": "django.db.backends.postgresql_psycopg2",
#         "NAME": "postgres", 
#         "USER": "postgres",
#         "PASSWORD": "Ss12345678",
#         "HOST": "localhost",
#         "PORT": "5432",
#     },
# }


# CACHES = {
#     'default': {
#         'BACKEND': 'django_redis.cache.RedisCache',
#         'LOCATION': 'redis://127.0.0.1:6379/1',  
#         'OPTIONS': {
#             'CLIENT_CLASS': 'django_redis.client.DefaultClient',
#         }
#     }
# }

# # Storage, static and media
# STATIC_URL = "/static/"
# STATIC_ROOT = "/usr/src/static/"
# MEDIA_URL = "/media/"
# MEDIA_ROOT = "/usr/src/media/"
