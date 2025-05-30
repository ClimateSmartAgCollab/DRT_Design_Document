from django.utils import timezone
from django.db import transaction
from django.utils.translation import gettext_lazy as _
from ..models import Negotiation
import datetime
import logging
from ..views import stats
from django.http import JsonResponse

logger = logging.getLogger(__name__)


def handle_negotiation_archive_and_summary(negotiation):
    """Archives the negotiation and exports summary statistics."""
    try:
        with transaction.atomic():
            stats.export_summary_to_drt()
            if not negotiation.archived:
                stats.archive_negotiation(negotiation)
    except Exception as e:
        logger.error(
            f"Error processing negotiation {negotiation.negotiation_id}: {e}")
        return JsonResponse({'error': _('An error occurred while processing negotiation.')}, status=500)
    return JsonResponse({'message': _('Negotiation processed successfully')})



def delete_old_negotiations():
    """Delete negotiations older than 30 days."""
    cutoff_date = timezone.now() - datetime.timedelta(days=30)
    with transaction.atomic():
        negotiations = Negotiation.objects.filter(
            timestamps__lt=cutoff_date,
            state__in=['completed', 'canceled', 'rejected'],
            archived=True
        )
        count = negotiations.count()
        negotiations.delete()
    return JsonResponse({'message': _('Old negotiations deleted successfully'), 'deleted_count': count})
