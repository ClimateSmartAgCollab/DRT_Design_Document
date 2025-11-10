# drt_core\settings\dev.py

from .base import * 
import environ

# Initialize environment variables
env = environ.Env()
environ.Env.read_env()

DEBUG = "True"
# We open everything on local mode
ALLOWED_HOSTS = ["*"]
CSRF_COOKIE_SAMESITE = "None"
CSRF_COOKIE_SECURE = True
CSRF_TRUSTED_ORIGINS = ["http://*"]

# # EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend' # in console for now
# # Use SMTP to send real mail in dev
# EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
# EMAIL_HOST        = env('EMAIL_HOST')
# EMAIL_PORT        = env.int('EMAIL_PORT')
# EMAIL_HOST_USER   = env('EMAIL_HOST_USER')
# EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD')
# EMAIL_USE_TLS     = True

# # DEFAULT_FROM_EMAIL = 'sanavisetayesh@gmail.com'
# # What the emails will appear “from”
# DEFAULT_FROM_EMAIL = 'DART System <noreply@dart-system.com>'

EMAIL_BACKEND       = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST          = 'sandbox.smtp.mailtrap.io'
EMAIL_PORT          = 2525          # or whatever Mailtrap gives you
EMAIL_HOST_USER     = 'c8cd1ba2ff8f76'
EMAIL_HOST_PASSWORD = '09e6155f2b8de1'
EMAIL_USE_TLS       = True          # Mailtrap supports TLS
DEFAULT_FROM_EMAIL  = 'DART System <noreply@dev.local>'




CORS_ORIGIN_ALLOW_ALL = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
FRONTEND_BASE_URL = "http://127.0.0.1:3000" 


DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql_psycopg2",
        "NAME": "postgres", 
        "USER": "postgres",
        "PASSWORD": "Ss12345678",
        "HOST": "localhost",
        "PORT": "5432",
    },
}


CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1', 
        'TIMEOUT': 60 * 60,  # cache entries expire after 1 hour 
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Storage, static and media
STATIC_URL = "/static/"
STATIC_ROOT = "/usr/src/static/"
MEDIA_URL = "/media/"
MEDIA_ROOT = "/usr/src/media/"
