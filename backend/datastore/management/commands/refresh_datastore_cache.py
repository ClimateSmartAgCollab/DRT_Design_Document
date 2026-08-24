from django.core.management.base import BaseCommand
from drt.tasks import refresh_data_task


class Command(BaseCommand):
    help = "Refresh the datastore cache (ContextHub or GitHub)."

    def handle(self, *args, **options):
        result = refresh_data_task()
        if not result or not result.get("ok"):
            error = (result or {}).get("error", "unknown error")
            self.stderr.write(self.style.ERROR(f"Datastore cache refresh failed: {error}"))
            raise SystemExit(1)
        self.stdout.write(
            self.style.SUCCESS(
                "Datastore cache refresh completed: "
                f"{result.get('status')} ({result.get('elapsed_time', 0) or 0:.2f}s)"
            )
        )
