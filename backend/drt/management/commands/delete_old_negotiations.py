from django.core.management.base import BaseCommand
from django.utils import timezone
from drt.services.negotiation import delete_old_negotiations
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Delete archived negotiations older than 30 days"

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS(f"Starting old-negotiation deletion at {timezone.now()}")
        )

        try:
            result = delete_old_negotiations()
            self.stdout.write(
                self.style.SUCCESS(
                    f"{result['message']}: {result.get('deleted_count', 0)} deleted"
                )
            )
        except Exception as e:
            logger.error("Error in delete_old_negotiations command: %s", e)
            self.stdout.write(self.style.ERROR(f"Error deleting old negotiations: {e}"))
            raise SystemExit(1)
