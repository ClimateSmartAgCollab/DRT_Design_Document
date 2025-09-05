from django.core.management.base import BaseCommand
from django.utils import timezone
from drt.services.negotiation import process_abandonment_policy
from drt.tasks import process_abandonment_policy_task
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Process the abandonment policy for inactive negotiations'

    def add_arguments(self, parser):
        parser.add_argument(
            '--async',
            action='store_true',
            help='Run the abandonment policy processing asynchronously using Celery',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be processed without making changes',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS(f'Starting abandonment policy processing at {timezone.now()}')
        )

        if options['dry_run']:
            self.stdout.write(
                self.style.WARNING('DRY RUN MODE - No changes will be made')
            )
            # TODO: Implement dry run functionality
            return

        try:
            if options['async']:
                # Run asynchronously using Celery
                task = process_abandonment_policy_task.delay()
                self.stdout.write(
                    self.style.SUCCESS(f'Abandonment policy task queued with ID: {task.id}')
                )
            else:
                # Run synchronously
                result = process_abandonment_policy()
                
                if 'error' in result:
                    self.stdout.write(
                        self.style.ERROR(f'Error processing abandonment policy: {result["error"]}')
                    )
                else:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Abandonment policy processed successfully:\n'
                            f'  - Reminders sent: {result.get("reminders_sent", 0)}\n'
                            f'  - Negotiations abandoned: {result.get("negotiations_abandoned", 0)}\n'
                            f'  - Total processed: {result.get("total_processed", 0)}'
                        )
                    )

        except Exception as e:
            logger.error(f"Error in abandonment policy command: {e}")
            self.stdout.write(
                self.style.ERROR(f'Error processing abandonment policy: {e}')
            )
            raise

