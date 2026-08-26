from django.apps import AppConfig
import logging
import os
import sys
import threading

from .cache_keys import KEY_DATASTORE_PREWARM_LOCK, TTL_PREWARM_LOCK

logger = logging.getLogger(__name__)


def should_prewarm_on_ready(argv=None, environ=None):
    """True for the runserver reloader child or a gunicorn worker.

    ``RUN_MAIN`` is only set by ``manage.py runserver``. Gunicorn never sets it,
    so gating on that flag alone skips production prewarm. Management commands
    (migrate, tests, cron refresh) must not start a duplicate warm thread.
    """
    environ = os.environ if environ is None else environ
    argv = sys.argv if argv is None else argv
    if environ.get("RUN_MAIN") == "true":
        return True
    argv0 = os.path.basename(argv[0] if argv else "")
    return "gunicorn" in argv0


class DatastoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'datastore'

    def ready(self):
        if not should_prewarm_on_ready():
            return

        def _prewarm_cache():
            from django.core.cache import cache
            from .views import warm_github_cache

            if not cache.add(KEY_DATASTORE_PREWARM_LOCK, 1, TTL_PREWARM_LOCK):
                return
            try:
                warm_github_cache()
            except Exception:
                logger.exception("Datastore prewarm failed")
            finally:
                cache.delete(KEY_DATASTORE_PREWARM_LOCK)

        threading.Thread(target=_prewarm_cache, daemon=True).start()
