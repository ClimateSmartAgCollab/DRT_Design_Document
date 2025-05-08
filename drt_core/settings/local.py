# drt_core\settings\local.py
from .base import *  # noqa: F403, F401
import os
import dj_database_url


# We open everything on local mode
ALLOWED_HOSTS = ["*"]
CSRF_COOKIE_SAMESITE = "None"
CSRF_COOKIE_SECURE = True
CSRF_TRUSTED_ORIGINS = ["http://*"]


INSTALLED_APPS += ["anymail"]

EMAIL_BACKEND = "anymail.backends.mailgun.EmailBackend"
ANYMAIL = {
    "MAILGUN_API_KEY": os.environ.get("MAILGUN_API_KEY"),
    "MAILGUN_SENDER_DOMAIN": "sandbox52c30de58b9b48c2925e0795c53759c9.mailgun.org",
}
DEFAULT_FROM_EMAIL = "DART System <postmaster@sandbox52c30de58b9b48c2925e0795c53759c9.mailgun.org>"


# # Use SendGrid’s Web API backend
# EMAIL_BACKEND = "sendgrid_backend.SendgridBackend"
# SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY")

# # Standard “from” address must match your Single-Sender
# DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL")

# # Use SendGrid’s SMTP backend (optional)
# EMAIL_BACKEND      = "django.core.mail.backends.smtp.EmailBackend"
# EMAIL_HOST         = "smtp.sendgrid.net"
# EMAIL_PORT         = 587
# EMAIL_HOST_USER    = "apikey"
# EMAIL_HOST_PASSWORD= os.environ.get("SENDGRID_API_KEY")
# EMAIL_USE_TLS      = True
# DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL")




CORS_ORIGIN_ALLOW_ALL = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    'http://127.0.0.1:3000',  # Frontend origin
]
FRONTEND_BASE_URL = "http://127.0.0.1:3000" 


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

REDIS_URL = os.environ.get("REDIS_URL")
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
