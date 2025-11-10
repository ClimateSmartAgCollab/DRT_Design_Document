from django.utils import timezone
from django.db import transaction
from django.utils.translation import gettext_lazy as _
from ..models import Negotiation, NLink
import datetime
import logging
from django.core.cache import cache
from ..views import stats
from django.http import JsonResponse
from ..tasks import send_abandonment_reminder_email_task, send_abandonment_notification_email_task
from ..services.history import create_archive_snapshot

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
            state__in=['accepted', 'canceled', 'rejected'],
            archived=True
        )
        count = negotiations.count()
        negotiations.delete()
    return JsonResponse({'message': _('Old negotiations deleted successfully'), 'deleted_count': count})


def get_inactive_negotiations():
    """Get negotiations that have been inactive for 30+ days."""
    cutoff_date = timezone.now() - datetime.timedelta(days=30)
    inactive_negotiations = Negotiation.objects.filter(
        link__last_activity__lt=cutoff_date,
        state__in=['requestor_open', 'owner_open'],
        archived=False
    ).select_related('link')
    
    return inactive_negotiations


def get_negotiations_for_abandonment():
    """Get negotiations that should be abandoned (30+ days inactive + 3+ days since reminder)."""
    reminder_cutoff = timezone.now() - datetime.timedelta(days=3)
    abandonment_cutoff = timezone.now() - datetime.timedelta(days=30)
    
    negotiations_for_abandonment = Negotiation.objects.filter(
        link__last_activity__lt=abandonment_cutoff,
        state__in=['requestor_open', 'owner_open'],
        archived=False,
        reminder_sent=True,
        reminder_sent_date__lt=reminder_cutoff
    ).select_related('link')
    
    return negotiations_for_abandonment


def send_abandonment_reminder_email(negotiation):
    """Send reminder email for inactive negotiations to the appropriate party."""
    try:
        nlink = negotiation.link
        if not nlink:
            logger.warning(f"No link found for negotiation {negotiation.negotiation_id}")
            return False
        
        # Determine who should receive the email based on negotiation state
        if negotiation.state == 'requestor_open':
            # Requestor needs to act - send email to requestor
            if not nlink.requestor_email:
                logger.warning(f"No requestor email found for negotiation {negotiation.negotiation_id}")
                return False
            
            send_abandonment_reminder_email_task.delay(
                nlink.requestor_email,
                str(nlink.requestor_link),
                negotiation.questionnaire_SAID,
                'requestor'
            )
            logger.info(f"Abandonment reminder sent to REQUESTOR for negotiation {negotiation.negotiation_id}")
            
        elif negotiation.state == 'owner_open':
            # Owner needs to act - send email to owner
            
            owner_table = cache.get("owner_table", {})
            owner_email = owner_table.get(nlink.owner_id, {}).get("owner_email")
            
            if not owner_email:
                logger.warning(f"No owner email found for negotiation {negotiation.negotiation_id}")
                return False
            
            send_abandonment_reminder_email_task.delay(
                owner_email,
                str(nlink.owner_link),
                negotiation.questionnaire_SAID,
                'owner'
            )
            logger.info(f"Abandonment reminder sent to OWNER for negotiation {negotiation.negotiation_id}")
        
        # Mark reminder as sent with timestamp
        negotiation.reminder_sent = True
        negotiation.reminder_sent_date = timezone.now()
        negotiation.save()
        
        return True
        
    except Exception as e:
        logger.error(f"Error sending abandonment reminder for negotiation {negotiation.negotiation_id}: {e}")
        return False


def mark_negotiation_abandoned(negotiation):
    """Mark a negotiation as abandoned and archive it."""
    try:
        with transaction.atomic():
            
            create_archive_snapshot(
                negotiation,
                changed_by="system",
                change_description="Negotiation marked as abandoned due to inactivity (30+ days)"
            )
            
            negotiation.state = 'abandoned'
            negotiation.archived = True
            negotiation.save()
            
            nlink = negotiation.link
            if nlink and nlink.requestor_email:
                
                send_abandonment_notification_email_task.delay(
                    nlink.requestor_email,
                    str(nlink.requestor_link),
                    negotiation.questionnaire_SAID
                )            
            logger.info(f"Negotiation {negotiation.negotiation_id} marked as abandoned")
            return True
            
    except Exception as e:
        logger.error(f"Error marking negotiation {negotiation.negotiation_id} as abandoned: {e}")
        return False


def process_abandonment_policy():
    """Process the abandonment policy for inactive negotiations."""
    try:
        
        inactive_negotiations = get_inactive_negotiations()
        reminder_count = 0
                
        for negotiation in inactive_negotiations:
            if not negotiation.reminder_sent:
                if send_abandonment_reminder_email(negotiation):
                    reminder_count += 1
      
        negotiations_for_abandonment = get_negotiations_for_abandonment()
        abandoned_count = 0
                
        for negotiation in negotiations_for_abandonment:
            if mark_negotiation_abandoned(negotiation):
                abandoned_count += 1            
        
        
        return {
            'reminders_sent': reminder_count,
            'negotiations_abandoned': abandoned_count,
            'total_inactive': len(inactive_negotiations),
            'total_for_abandonment': len(negotiations_for_abandonment)
        }
        
    except Exception as e:
        logger.error(f"Error processing abandonment policy: {e}")
        logger.exception("Full traceback:")
        return {'error': str(e)}


def abandon_negotiation_by_requestor(negotiation):
    """Allow requestor to abandon their own negotiation."""
    try:
        with transaction.atomic():
            create_archive_snapshot(
                negotiation,
                changed_by="requestor",
                change_description="Negotiation abandoned by requestor"
            )
            
            negotiation.state = 'abandoned'
            negotiation.archived = True
            negotiation.save()
            
            if hasattr(negotiation, 'link') and negotiation.link:
                negotiation.link.save(update_fields=['last_activity'])
            
            logger.info(f"Negotiation {negotiation.negotiation_id} abandoned by requestor")
            return True
            
    except Exception as e:
        logger.error(f"Error abandoning negotiation {negotiation.negotiation_id} by requestor: {e}")
        return False
