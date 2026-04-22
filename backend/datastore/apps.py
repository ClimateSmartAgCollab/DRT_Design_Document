from django.apps import AppConfig
import os
import threading


class DatastoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'datastore'

    def ready(self):
        if os.environ.get("RUN_MAIN") != "true":
            return

        def _prewarm_cache():
            from .views import load_github_data
            load_github_data(None)

        threading.Thread(target=_prewarm_cache, daemon=True).start()
 