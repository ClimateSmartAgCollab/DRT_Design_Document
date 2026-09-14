from django.core.management.base import BaseCommand
from django.utils import timezone
from drt.views.stats import export_summary_to_drt
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Export per-dataset summary statistics into SummaryStatistic"

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS(f"Starting summary export at {timezone.now()}")
        )

        try:
            export_summary_to_drt()
            self.stdout.write(
                self.style.SUCCESS("Summary statistics exported successfully")
            )
        except Exception as e:
            logger.error("Error in export_summary_to_drt command: %s", e)
            self.stdout.write(self.style.ERROR(f"Error exporting summary statistics: {e}"))
            raise SystemExit(1)
