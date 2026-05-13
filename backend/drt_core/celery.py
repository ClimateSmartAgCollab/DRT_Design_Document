import os
from celery import Celery

# DJANGO_SETTINGS_MODULE is read from the environment; "local" is only the dev fallback.
# Production deployments must set DJANGO_SETTINGS_MODULE=drt_core.settings.production.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'drt_core.settings.local')

app = Celery('drt_core')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}') 