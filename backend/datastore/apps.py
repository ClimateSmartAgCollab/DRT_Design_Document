from django.apps import AppConfig
import os
import threading


class DatastoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'datastore'

    def ready(self): 
        # avoid running twice under Django's autoreloader
        if os.environ.get("RUN_MAIN") != "true":
            return

        def _prewarm_cache():
            from .views import warm_github_cache
            warm_github_cache()

        threading.Thread(target=_prewarm_cache, daemon=True).start()
 