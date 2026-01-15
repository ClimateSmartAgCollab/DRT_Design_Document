import logging
from celery import shared_task
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.core.cache import cache
from .utils.email_helpers import (
    get_verification_email_html, get_notification_email_html, get_rejection_email_html,
    get_clarification_email_html, get_reopen_email_html, get_abandonment_reminder_html,
    get_abandonment_notification_html, get_magic_link_resend_html, get_plain_text_email
)

logger = logging.getLogger(__name__)


@shared_task
def send_owner_email_task(email, magic_link, expiry):
    """Send owner email asynchronously using Celery"""
    try:
        # Generate consistent HTML content
        html_content = get_verification_email_html(
            magic_link=magic_link,
            expiry=f"{expiry:%Y-%m-%d %H:%M} UTC",
            recipient_type="owner"
        )
        
        # Generate plain text content
        plain_text_content = (
            "Hello,\n\n"
            "Click the link below to verify your email:\n\n"
            f"    {magic_link}\n\n"
            f"This link will expire at {expiry:%Y-%m-%d %H:%M} UTC.\n\n"
            "For your security, please do not share this link with anyone. "
            "If you did not request this link, simply ignore this message or "
            "contact our support team at adc@uoguelph.ca.\n\n"
            "Best regards,\n"
            "The DRT System"
        )
        
        msg = EmailMultiAlternatives(
            subject="Access Link for Owner Verification",
            body=plain_text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[email],
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=True)
        logger.info(f"Owner email sent successfully to {email}")
    except Exception as e:
        logger.error(f"Error sending owner email: {str(e)}")
        raise


@shared_task
def send_admin_email_task(email, magic_link, expiry):
    """Send admin email asynchronously using Celery"""
    try:
        html_content = get_verification_email_html(
            magic_link=magic_link,
            expiry=f"{expiry:%Y-%m-%d %H:%M} UTC",
            recipient_type="admin"
        )
        
        plain_text_content = (
            "Hello,\n\n"
            "Click the link below to verify your email and access the admin dashboard:\n\n"
            f"    {magic_link}\n\n"
            f"This link will expire at {expiry:%Y-%m-%d %H:%M} UTC.\n\n"
            "For your security, please do not share this link with anyone. "
            "If you did not request this link, simply ignore this message or "
            "contact our support team at adc@uoguelph.ca.\n\n"
            "Best regards,\n"
            "The DRT System"
        )
        
        msg = EmailMultiAlternatives(
            subject="Admin Access Link for DRT System",
            body=plain_text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[email],
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=True)
        logger.info(f"Admin email sent successfully to {email}")
    except Exception as e:
        logger.error(f"Error sending admin email: {str(e)}")
        raise


@shared_task
def send_requestor_email_task(email, magic_link, expiry):
    """Send requestor email asynchronously using Celery"""
    try:
        html_content = get_verification_email_html(
            magic_link=magic_link,
            expiry=f"{expiry:%Y-%m-%d %H:%M} UTC",
            recipient_type="requestor"
        )
        
        plain_text_content = (
            "Hello,\n\n"
            "Click the link below to verify your email:\n\n"
            f"    {magic_link}\n\n"
            f"This link will expire at {expiry:%Y-%m-%d %H:%M} UTC.\n\n"
            "For your security, please do not share this link with anyone. "
            "If you did not request this link, simply ignore this message or "
            "contact our support team at adc@uoguelph.ca.\n\n"
            "Best regards,\n"
            "The DRT System"
        )
        
        msg = EmailMultiAlternatives(
            subject="Access Link for Requestor Verification",
            body=plain_text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[email],
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=True)
        logger.info(f"Requestor email sent successfully to {email}")
    except Exception as e:
        logger.error(f"Error sending requestor email: {str(e)}")
        raise


@shared_task
def send_notification_emails_task(nlink_id, owner_review_url):
    """Send notification emails asynchronously using Celery"""
    try:
        from .models import NLink
        from .views.auth import generate_owner_magic_link_with_target
        nlink = NLink.objects.get(link_id=nlink_id)

        # Get owner email from cache
        owner_table = cache.get("owner_table", {})
        owner_email = owner_table.get(nlink.owner_id, {}).get("owner_email")

        if not owner_email:
            logger.error(f"Owner email not found for ID: {nlink.owner_id}")
            return

        # Generate magic link with target URL for owner authentication
        magic_link, expiry = generate_owner_magic_link_with_target(
            owner_email, owner_review_url)

        # Determine if this is a new or updated request using submission_version
        try:
            submission_version = getattr(nlink.negotiation, 'submission_version', 0) or 0
        except Exception:
            submission_version = 0
        # First submission (version 1) → New; subsequent (>1) → Updated
        is_new_request = submission_version <= 1

        owner_subject = (
            "New Data Access Request - Action Required" if is_new_request
            else "Updated Data Access Request - Action Required"
        )
        owner_intro = (
            "A new data access request has been submitted for your dataset."
            if is_new_request
            else "The requestor has updated their access request based on your feedback."
        )

        dashboard_url_owner = f"{settings.FRONTEND_BASE_URL}/negotiation/owner/homepage"

        # Send email to owner
        email_type = "owner_new_request" if is_new_request else "owner_updated_request"
        owner_html_content = get_notification_email_html(
            email_type=email_type,
            dataset_name=nlink.negotiation.questionnaire_SAID,
            requestor_email=nlink.requestor_email,
            magic_link=magic_link,
            expiry=f"{expiry:%Y-%m-%d %H:%M} UTC",
            dashboard_url=dashboard_url_owner,
            is_new_request=is_new_request
        )
        
        owner_plain_text = (
            f"Hello,\n\n"
            f"{owner_intro}\n\n"
            f"Requestor: {nlink.requestor_email}\n"
            f"Dataset: {nlink.negotiation.questionnaire_SAID}\n\n"
            f"Please click the link below to verify your email and review the request:\n\n"
            f"    {magic_link}\n\n"
            f"This link will expire on {expiry:%Y-%m-%d %H:%M} UTC.\n\n"
            f"Alternative access: You can also use your Dashboard at {dashboard_url_owner}.\n\n"
            f"If you have any questions or need assistance, simply reach out to our support team at adc@uoguelph.ca.\n\n"
            f"Best regards,\n"
            f"The DRT System"
        )
        
        owner_msg = EmailMultiAlternatives(
            subject=owner_subject,
            body=owner_plain_text,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[owner_email],
        )
        owner_msg.attach_alternative(owner_html_content, "text/html")
        owner_msg.send(fail_silently=True)

        # Send email to requestor
        req_subject = (
            "Data Access Request Submitted Successfully" if is_new_request
            else "Data Access Request Updated Successfully"
        )
        req_intro = (
            "Your data access request has been submitted successfully."
            if is_new_request
            else "Your data access request has been updated successfully."
        )
        dashboard_url_req = f"{settings.FRONTEND_BASE_URL}/negotiation/homepage"

        # Send email to requestor
        requestor_html_content = get_notification_email_html(
            email_type="requestor_confirmation",
            dataset_name=nlink.negotiation.questionnaire_SAID,
            owner_email=owner_email,
            dashboard_url=dashboard_url_req,
            is_new_request=is_new_request
        )
        
        requestor_plain_text = (
            f"Hello,\n\n"
            f"{req_intro}\n\n"
            f"Dataset: {nlink.negotiation.questionnaire_SAID}\n"
            f"We will notify you once the owner reviews your request.\n\n"
            f"You can access your Dashboard at: {dashboard_url_req}\n\n"
            f"If you have any questions or need assistance, simply reach out to our support team at adc@uoguelph.ca.\n\n"
            f"Best regards,\n"
            f"The DRT System"
        )
        
        requestor_msg = EmailMultiAlternatives(
            subject=req_subject,
            body=requestor_plain_text,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[nlink.requestor_email],
        )
        requestor_msg.attach_alternative(requestor_html_content, "text/html")
        requestor_msg.send(fail_silently=True)

        logger.info(f"Notification emails sent for negotiation {nlink_id}")
    except Exception as e:
        logger.error(f"Error sending notification emails: {str(e)}")
        raise


@shared_task
def fetch_questionnaire_task(questionnaire_said):
    """Fetch questionnaire asynchronously using Celery"""
    try:
        from datastore.views import fetch_questionnaire_json
        fetched_json = fetch_questionnaire_json(questionnaire_said)
        if fetched_json:
            cache_key = f'questionnaire_json_{questionnaire_said}'
            cache.set(cache_key, fetched_json, timeout=60*60*24)
            logger.info(
                f"Questionnaire {questionnaire_said} fetched and cached successfully")
        return fetched_json
    except Exception as e:
        logger.error(
            f"Error fetching questionnaire {questionnaire_said}: {str(e)}")
        raise


@shared_task
def generate_license_and_notify_owner_task(nlink_id):
    """Generate license and notify owner asynchronously using Celery"""
    try:
        from .models import NLink
        from .services.license import generate_license_and_notify_owner
        nlink = NLink.objects.get(link_id=nlink_id)

        # Generate license and send email
        generate_license_and_notify_owner(nlink)

        logger.info(
            f"License generated and owner notified for negotiation {nlink_id}")
    except Exception as e:
        logger.error(f"Error generating license and notifying owner: {str(e)}")
        raise


@shared_task
def send_rejection_email_task(requestor_email, requestor_link, rationale):
    """Send rejection email asynchronously using Celery"""
    try:
        dashboard_url = f"{settings.FRONTEND_BASE_URL}/negotiation/homepage"
        questionnaire_url = f"{settings.FRONTEND_BASE_URL}/negotiation/{requestor_link}/fill-questionnaire"
        
        # Try to get additional request details from the database
        try:
            from .models import NLink
            nlink = NLink.objects.get(requestor_link=requestor_link)
            record_label = nlink.record_label
        except Exception:
            record_label = None
        
        # Generate consistent HTML content
        html_content = get_rejection_email_html(
            dataset_name="Data Access Request",
            rationale=rationale,
            dashboard_url=dashboard_url,
            questionnaire_url=questionnaire_url,
            record_label=record_label
        )
        
        # Generate plain text content
        plain_text_content = (
            f"Hello,\n\n"
            f"Your data access request has been rejected.\n\n"
        )
        
        if record_label:
            plain_text_content += f"Dataset: {record_label}\n"
        plain_text_content += f"Reason: {rationale}\n\n"
        
        plain_text_content += f"You can:\n"
        plain_text_content += f"1. View this request: {questionnaire_url}\n"
        plain_text_content += f"2. Access your Dashboard: {dashboard_url}\n\n"
        
        plain_text_content += (
            f"You can review the rejection reason above and consider submitting a new request with additional information or clarification if needed.\n\n"
            f"If you have any questions or need assistance, simply reach out to our support team at adc@uoguelph.ca.\n\n"
            f"Best regards,\n"
            f"The DRT System"
        )
        
        msg = EmailMultiAlternatives(
            subject="Data Access Request Rejected",
            body=plain_text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[requestor_email],
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=True)

        logger.info(f"Rejection email sent to {requestor_email}")
    except Exception as e:
        logger.error(f"Error sending rejection email: {str(e)}")
        raise


@shared_task
def send_clarification_email_task(requestor_email, clarification_url):
    """Send clarification email asynchronously using Celery"""
    try:
        # Generate consistent HTML content
        html_content = get_clarification_email_html(
            dataset_name="Data Access Request",  # Could be enhanced to get actual dataset name
            clarification_url=clarification_url
        )
        
        # Generate plain text content
        plain_text_content = (
            "Hello,\n\n"
            "We need a bit more information to proceed with your request.\n"
            "Please complete the necessary details by accessing your form at the link below:\n\n"
            f"    {clarification_url}\n\n"
            "If you have any questions or need assistance, simply reach out to our support team at adc@uoguelph.ca.\n\n"
            "Thank you for your prompt attention.\n\n"
            "Best regards,\n"
            "The DRT System"
        )
        
        msg = EmailMultiAlternatives(
            subject="Data Access Request - Clarification Required",
            body=plain_text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[requestor_email],
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=True)

        logger.info(f"Clarification email sent to {requestor_email}")
    except Exception as e:
        logger.error(f"Error sending clarification email: {str(e)}")
        raise


@shared_task
def send_magic_link_resend_email_task(requestor_email, magic_link):
    """Send magic link resend email asynchronously using Celery"""
    try:
        # Generate consistent HTML content
        html_content = get_magic_link_resend_html(magic_link=magic_link)
        
        # Generate plain text content
        plain_text_content = (
            f"Hello,\n\n"
            f"Here is your access link again:\n\n"
            f"{magic_link}\n\n"
            f"If you have any questions or need assistance, simply reach out to our support team at adc@uoguelph.ca.\n\n"
            f"Best regards,\n"
            f"The DRT System"
        )
        
        msg = EmailMultiAlternatives(
            subject="Access Link Resent",
            body=plain_text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[requestor_email],
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=True)

        logger.info(f"Magic link resend email sent to {requestor_email}")
    except Exception as e:
        logger.error(f"Error sending magic link resend email: {str(e)}")
        raise


@shared_task
def send_requestor_verification_email_task(email, magic_link, expiry):
    """Send requestor verification email asynchronously using Celery"""
    try:
        # Generate consistent HTML content
        html_content = get_verification_email_html(
            magic_link=magic_link,
            expiry=f"{expiry:%Y-%m-%d %H:%M} UTC",
            recipient_type="requestor"
        )
        
        # Generate plain text content
        plain_text_content = (
            "Hello,\n\n"
            "Click the link below to verify your email and access the questionnaire:\n\n"
            f"{magic_link}\n\n"
            f"This link will expire at {expiry:%Y-%m-%d %H:%M} UTC.\n\n"
            "For your security, please do not share this link with anyone. "
            "If you did not request this link, simply ignore this message or "
            "contact our support team at adc@uoguelph.ca.\n\n"
            "Best regards,\n"
            "The DRT System"
        )
        
        msg = EmailMultiAlternatives(
            subject="Access Link for Requestor Verification",
            body=plain_text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[email],
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=True)

        logger.info(f"Requestor verification email sent to {email}")
    except Exception as e:
        logger.error(f"Error sending requestor verification email: {str(e)}")
        raise


@shared_task
def handle_negotiation_archive_and_summary_task(negotiation_id):
    """Handle negotiation archive and summary asynchronously using Celery"""
    try:
        from .models import Negotiation
        from .views.stats import handle_negotiation_archive_and_summary_async
        negotiation = Negotiation.objects.get(negotiation_id=negotiation_id)
        handle_negotiation_archive_and_summary_async(negotiation)
        logger.info(
            f"Negotiation archive and summary handled for {negotiation_id}")
    except Exception as e:
        logger.error(
            f"Error handling negotiation archive and summary: {str(e)}")
        raise


@shared_task
def refresh_data_task():
    """Refresh data asynchronously using Celery"""
    try:
        from datastore.views import refresh_data
        refresh_data()
        logger.info("Data refresh completed successfully")
    except Exception as e:
        logger.error(f"Error refreshing data: {str(e)}")
        raise


@shared_task
def send_reopen_notification_email_task(requestor_email, requestor_link, previous_state):
    """Send reopen notification email asynchronously using Celery"""
    try:
        # Debug: Log email configuration
        logger.info(f"Email config - BACKEND: {settings.EMAIL_BACKEND}, HOST: {settings.EMAIL_HOST}, USER: {settings.EMAIL_HOST_USER}")
        
        state_display = {
            'accepted': 'Accepted',
            'rejected': 'Rejected', 
            'abandoned': 'Abandoned'
        }.get(previous_state, previous_state)
        
        dashboard_url = f"{settings.FRONTEND_BASE_URL}/negotiation/homepage"
        questionnaire_url = f"{settings.FRONTEND_BASE_URL}/negotiation/{requestor_link}/fill-questionnaire"
        
        # Try to get additional request details from the database
        try:
            from .models import NLink
            nlink = NLink.objects.get(requestor_link=requestor_link)
            record_label = nlink.record_label
        except Exception:
            record_label = None
        
        # Generate consistent HTML content
        html_content = get_reopen_email_html(
            dataset_name="Data Access Request",
            previous_state=state_display,
            dashboard_url=dashboard_url,
            questionnaire_url=questionnaire_url,
            record_label=record_label
        )
        
        # Generate plain text content
        plain_text_content = (
            f"Hello,\n\n"
            f"Your data access request has been reopened by the data owner.\n\n"
        )
        
        if record_label:
            plain_text_content += f"Dataset: {record_label}\n"
        plain_text_content += f"Previous Status: {state_display}\n\n"
        
        plain_text_content += f"You can now continue with your request:\n"
        plain_text_content += f"1. Direct link to your questionnaire: {questionnaire_url}\n"
        plain_text_content += f"2. Access your Dashboard: {dashboard_url}\n\n"
        
        plain_text_content += (
            f"If you have any questions or need assistance, simply reach out to our support team at adc@uoguelph.ca.\n\n"
            f"Best regards,\n"
            f"The DRT System"
        )
        
        msg = EmailMultiAlternatives(
            subject="Data Access Request Reopened",
            body=plain_text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[requestor_email],
        )
        msg.attach_alternative(html_content, "text/html")
        
        # Try to send email and log the result
        try:
            result = msg.send(fail_silently=False)
            logger.info(f"Email send result: {result}")
            logger.info(f"Reopen notification email sent to {requestor_email}")
        except Exception as send_error:
            logger.error(f"SMTP send error: {str(send_error)}")
            raise
            
    except Exception as e:
        logger.error(f"Error sending reopen notification email: {str(e)}")
        logger.exception("Full traceback:")
        raise


@shared_task
def send_abandonment_reminder_email_task(recipient_email, link_id, questionnaire_said, recipient_type):
    """Send abandonment reminder email asynchronously using Celery"""
    try:
        if recipient_type == 'requestor':
            subject = "Data Access Request - Action Required"
            dashboard_url = f"{settings.FRONTEND_BASE_URL}/negotiation/{link_id}/fill-questionnaire"
        else:  # owner
            subject = "Data Access Request Review - Action Required"
            dashboard_url = f"{settings.FRONTEND_BASE_URL}/negotiation/owner/{link_id}/owner-review"
        
        # Generate consistent HTML content
        html_content = get_abandonment_reminder_html(
            dataset_name=questionnaire_said,
            recipient_type=recipient_type,
            dashboard_url=dashboard_url
        )
        
        # Generate plain text content
        if recipient_type == 'requestor':
            action_text = "complete your questionnaire or take action"
            body_text = (
                f"Hello,\n\n"
                f"We noticed that your data access request has been inactive for over 30 days.\n\n"
                f"Dataset: {questionnaire_said}\n\n"
                f"To keep your request active, please {action_text} by accessing your Dashboard at: {dashboard_url}\n\n"
                f"You have 3 days to take action. If no action is taken within this period, your request will be automatically marked as abandoned.\n\n"
                f"If you no longer need this data or have any questions, please contact our support team at adc@uoguelph.ca.\n\n"
                f"Best regards,\n"
                f"The DRT System"
            )
        else:  # owner
            action_text = "review and respond to the request"
            body_text = (
                f"Hello,\n\n"
                f"We noticed that a data access request has been waiting for your review for over 30 days.\n\n"
                f"Dataset: {questionnaire_said}\n\n"
                f"To keep this request active, please {action_text} by accessing your review page at: {dashboard_url}\n\n"
                f"You have 3 days to take action. If no action is taken within this period, the request will be automatically marked as abandoned.\n\n"
                f"If you have any questions or need assistance, please contact our support team at adc@uoguelph.ca.\n\n"
                f"Best regards,\n"
                f"The DRT System"
            )
        
        msg = EmailMultiAlternatives(
            subject=subject,
            body=body_text,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient_email],
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=True)

        logger.info(f"Abandonment reminder email sent to {recipient_type} at {recipient_email}")
    except Exception as e:
        logger.error(f"Error sending abandonment reminder email: {str(e)}")
        raise


@shared_task
def send_abandonment_notification_email_task(requestor_email, requestor_link, questionnaire_said):
    """Send abandonment notification email to requestor asynchronously using Celery"""
    try:
        # Create the specific questionnaire link
        questionnaire_url = f"{settings.FRONTEND_BASE_URL}/negotiation/{requestor_link}/fill-questionnaire"
        dashboard_url = f"{settings.FRONTEND_BASE_URL}/negotiation/homepage"
        
        # Generate consistent HTML content
        html_content = get_abandonment_notification_html(
            dataset_name=questionnaire_said,
            questionnaire_url=questionnaire_url,
            dashboard_url=dashboard_url
        )
        
        # Generate plain text content
        plain_text_content = (
            f"Hello,\n\n"
            f"Your data access request has been automatically marked as abandoned due to inactivity.\n\n"
            f"Dataset: {questionnaire_said}\n\n"
            f"Reason: No activity was detected for over 33 days (30 days initial + 3 days grace period).\n\n"
            f"If you still need access to this data, you can:\n"
            f"1. Continue with this specific request: {questionnaire_url}\n"
            f"2. Access your Dashboard for all requests: {dashboard_url}\n\n"
            f"If you have any questions or need assistance, please contact our support team at adc@uoguelph.ca.\n\n"
            f"Best regards,\n"
            f"The DRT System"
        )
        
        msg = EmailMultiAlternatives(
            subject="Data Access Request - Abandoned",
            body=plain_text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[requestor_email],
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=True)

        logger.info(f"Abandonment notification email sent to {requestor_email}")
    except Exception as e:
        logger.error(f"Error sending abandonment notification email: {str(e)}")
        raise


@shared_task
def process_abandonment_policy_task():
    """Process abandonment policy asynchronously using Celery"""
    try:
        from .services.negotiation import process_abandonment_policy
        result = process_abandonment_policy()
        logger.info(f"Abandonment policy processed: {result}")
        return result
    except Exception as e:
        logger.error(f"Error processing abandonment policy: {str(e)}")
        raise
