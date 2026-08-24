from django.core.management.base import BaseCommand
from django.utils import timezone
from drt.services.negotiation import process_abandonment_policy
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Process the abandonment policy for inactive negotiations"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be processed without making changes",
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS(f"Starting abandonment policy processing at {timezone.now()}")
        )

        if options["dry_run"]:
            self.stdout.write(
                self.style.WARNING("DRY RUN MODE - No changes will be made")
            )
            return

        try:
            result = process_abandonment_policy()

            if "error" in result:
                self.stdout.write(
                    self.style.ERROR(f'Error processing abandonment policy: {result["error"]}')
                )
                raise SystemExit(1)

            self.stdout.write(
                self.style.SUCCESS(
                    "Abandonment policy processed successfully:\n"
                    f'  - Reminders sent: {result.get("reminders_sent", 0)}\n'
                    f'  - Negotiations abandoned: {result.get("negotiations_abandoned", 0)}\n'
                    f'  - Inactive: {result.get("total_inactive", 0)}\n'
                    f'  - Eligible for abandonment: {result.get("total_for_abandonment", 0)}'
                )
            )
        except Exception as e:
            logger.error("Error in abandonment policy command: %s", e)
            self.stdout.write(self.style.ERROR(f"Error processing abandonment policy: {e}"))
            raise
