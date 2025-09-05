import logging
from celery import shared_task
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)


@shared_task
def send_owner_email_task(email, magic_link, expiry):
    """Send owner email asynchronously using Celery"""
    try:
        msg = EmailMultiAlternatives(
            subject="Access Link for Owner Verification",
            body=(
                "Hello,\n\n"
                "Click the link below to verify your email:\n\n"
                f"    {magic_link}\n\n"
                f"This link will expire at {expiry:%H:%M}.\n\n"
                "For your security, please do not share this link with anyone. "
                "If you did not request this link, simply ignore this message or "
                "contact our support team at adc@uoguelph.ca.\n\n"
                "Best regards,\n"
                "The DRT System"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[email],
        )
        html_content = f"""
            <p>Hello,</p>
            <p>Click the link below to verify your email:</p>
            <p><a href=\"{magic_link}\" target=\"_blank\">{magic_link}</a></p>
            <p>This link will expire at {expiry:%H:%M}.</p>
            <p>For your security, please do not share this link with anyone.<br>
            If you did not request this link, simply ignore this message or contact our support team at adc@uoguelph.ca.</p>
            <p>Best regards,<br>The DRT System</p>
        """
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=True)
        logger.info(f"Owner email sent successfully to {email}")
    except Exception as e:
        logger.error(f"Error sending owner email: {str(e)}")
        raise


@shared_task
def send_requestor_email_task(email, magic_link, expiry):
    """Send requestor email asynchronously using Celery"""
    try:
        msg = EmailMultiAlternatives(
            subject="Access Link for Requestor Verification",
            body=(
                "Hello,\n\n"
                "Click the link below to verify your email:\n\n"
                f"    {magic_link}\n\n"
                f"This link will expire at {expiry:%H:%M}.\n\n"
                "For your security, please do not share this link with anyone. "
                "If you did not request this link, simply ignore this message or "
                "contact our support team at adc@uoguelph.ca.\n\n"
                "Best regards,\n"
                "The DRT System"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[email],
        )
        html_content = f"""
            <p>Hello,</p>
            <p>Click the link below to verify your email:</p>
            <p><a href=\"{magic_link}\" target=\"_blank\">{magic_link}</a></p>
            <p>This link will expire at {expiry:%H:%M}.</p>
            <p>For your security, please do not share this link with anyone.<br>
            If you did not request this link, simply ignore this message or contact our support team at adc@uoguelph.ca.</p>
            <p>Best regards,<br>The DRT System</p>
        """
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

        # Send email to owner
        owner_msg = EmailMultiAlternatives(
            subject="New Data Access Request - Action Required",
            body=(
                f"Hello,\n\n"
                f"A new data access request has been submitted for your dataset.\n\n"
                f"Requestor: {nlink.requestor_email}\n"
                f"Dataset: {nlink.negotiation.questionnaire_SAID}\n\n"
                f"Please click the link below to verify your email and review the request:\n\n"
                f"    {magic_link}\n\n"
                f"This link will expire at {expiry:%H:%M}.\n\n"
                f"If you have any questions or need assistance, simply reach out to our support team at adc@uoguelph.ca.\n\n"
                f"Best regards,\n"
                f"The DRT System"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[owner_email],
        )
        html_content = f"""
            <p>Hello,</p>
            <p>A new data access request has been submitted for your dataset.</p>
            <p><strong>Requestor:</strong> {nlink.requestor_email}<br>
            <strong>Dataset:</strong> {nlink.negotiation.questionnaire_SAID}</p>
            <p>Please click the link below to verify your email and review the request:</p>
            <p><a href="{magic_link}" target="_blank">{magic_link}</a></p>
            <p>This link will expire at {expiry:%H:%M}.</p>
            <p>Best regards,<br>The DRT System</p>
        """
        owner_msg.attach_alternative(html_content, "text/html")
        owner_msg.send(fail_silently=True)

        # Send email to requestor
        requestor_msg = EmailMultiAlternatives(
            subject="Data Access Request Submitted Successfully",
            body=(
                f"Hello,\n\n"
                f"Your data access request has been submitted successfully.\n\n"
                f"Dataset: {nlink.negotiation.questionnaire_SAID}\n"
                f"Owner: {owner_email}\n\n"
                f"We will notify you once the owner reviews your request.\n\n"
                f"You can access your Dashboard at: https://drt-test.canadacentral.cloudapp.azure.com/negotiation/homepage\n\n"
                f"If you have any questions or need assistance, simply reach out to our support team at adc@uoguelph.ca.\n\n"
                f"Best regards,\n"
                f"The DRT System"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[nlink.requestor_email],
        )
        
        html_content = f"""
            <p>Hello,</p>
            <p>Your data access request has been submitted successfully.</p>
            <p><strong>Dataset:</strong> {nlink.negotiation.questionnaire_SAID}<br>
            <strong>Owner:</strong> {owner_email}</p>
            <p>We will notify you once the owner reviews your request.</p>
            <p>You can access your <a href="https://drt-test.canadacentral.cloudapp.azure.com/negotiation/homepage" target="_blank">Dashboard</a>.</p>
            <p>If you have any questions or need assistance, simply reach out to our support team at adc@uoguelph.ca.</p>
            <p>Best regards,<br>The DRT System</p>
        """
        requestor_msg.attach_alternative(html_content, "text/html")
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
        msg = EmailMultiAlternatives(
            subject="Data Access Request Rejected",
            body=(
                f"Hello,\n\n"
                f"Your data access request has been rejected.\n\n"
                f"Reason: {rationale}\n\n"
                f"You can access your Dashboard at: https://drt-test.canadacentral.cloudapp.azure.com/negotiation/homepage\n\n"
                f"If you have any questions or need assistance, simply reach out to our support team at adc@uoguelph.ca.\n\n"
                f"Best regards,\n"
                f"The DRT System"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[requestor_email],
        )
        html_content = f"""
            <p>Hello,</p>
            <p>Your data access request has been rejected.</p>
            <p><strong>Reason:</strong> {rationale}</p>
            <p>You can access your <a href="https://drt-test.canadacentral.cloudapp.azure.com/negotiation/homepage" target="_blank">Dashboard</a>.</p>
            <p>If you have any questions or need assistance, simply reach out to our support team at adc@uoguelph.ca.</p>
            <p>Best regards,<br>The DRT System</p>
        """
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
        msg = EmailMultiAlternatives(
            subject="Data Access Request - Clarification Required",
            body=(
                "Hello,\n\n"
                "We need a bit more information to proceed with your request.\n"
                "Please complete the necessary details by accessing your form at the link below:\n\n"
                f"    {clarification_url}\n\n"
                "If you have any questions or need assistance, simply reach out to our support team at adc@uoguelph.ca.\n\n"
                "Thank you for your prompt attention.\n\n"
                "Best regards,\n"
                "The DRT System"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[requestor_email],
        )
        html_content = f"""
            <p>Hello,</p>
            <p>We need a bit more information to proceed with your request. "
            <p>Please complete the necessary details by accessing your form at the link below:</p>
            <p><a href="{clarification_url}" target="_blank">{clarification_url}</a></p>
            <p>If you have any questions or need assistance, simply reach out to our support team at adc@uoguelph.ca.</p>
            <p>Thank you for your prompt attention.</p>
            <p>Best regards,<br>The DRT System</p>
        """
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
        msg = EmailMultiAlternatives(
            subject="Access Link Resent",
            body=(
                f"Hello,\n\n"
                f"Here is your access link again:\n\n"
                f"{magic_link}\n\n"
                f"If you have any questions or need assistance, simply reach out to our support team at adc@uoguelph.ca"
                f"Best regards,\n"
                f"The DRT System"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[requestor_email],
        )
        msg.send(fail_silently=True)

        logger.info(f"Magic link resend email sent to {requestor_email}")
    except Exception as e:
        logger.error(f"Error sending magic link resend email: {str(e)}")
        raise


@shared_task
def send_requestor_verification_email_task(email, magic_link, expiry):
    """Send requestor verification email asynchronously using Celery"""
    try:
        msg = EmailMultiAlternatives(
            subject="Access Link for Requestor Verification",
            body=(
                "Hello,\n\n"
                "Click the link below to verify your email and access the questionnaire:\n\n"
                f"{magic_link}\n\n"
                f"This link will expire at {expiry:%H:%M}.\n\n"
                "For your security, please do not share this link with anyone. "
                "If you did not request this link, simply ignore this message or "
                "contact our support team at adc@uoguelph.ca.\n\n"
                "Best regards,\n"
                "The DRT System"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[email],
        )
        html_content = f"""
            <p>Hello,</p>
            <p>Click the link below to verify your email and access the questionnaire:</p>
            <p><a href=\"{magic_link}\" target=\"_blank\">{magic_link}</a></p>
            <p>This link will expire at {expiry:%H:%M}.</p>
            <p>For your security, please do not share this link with anyone.<br>
            If you did not request this link, simply ignore this message or contact our support team at adc@uoguelph.ca.</p>
            <p>Best regards,<br>The DRT System</p>
        """
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
        
        msg = EmailMultiAlternatives(
            subject="Data Access Request Reopened",
            body=(
                f"Hello,\n\n"
                f"Your data access request has been reopened by the data owner.\n\n"
                f"Previous Status: {state_display}\n\n"
                f"You can now continue with your request by accessing your Dashboard at: "
                f"https://drt-test.canadacentral.cloudapp.azure.com/negotiation/homepage\n\n"
                f"If you have any questions or need assistance, simply reach out to our support team at adc@uoguelph.ca.\n\n"
                f"Best regards,\n"
                f"The DRT System"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[requestor_email],
        )
        html_content = f"""
            <p>Hello,</p>
            <p>Your data access request has been reopened by the data owner.</p>
            <p><strong>Previous Status:</strong> {state_display}</p>
            <p>You can now continue with your request by accessing your <a href="https://drt-test.canadacentral.cloudapp.azure.com/negotiation/homepage" target="_blank">Dashboard</a>.</p>
            <p>If you have any questions or need assistance, simply reach out to our support team at adc@uoguelph.ca.</p>
            <p>Best regards,<br>The DRT System</p>
        """
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
            dashboard_url = "https://drt-test.canadacentral.cloudapp.azure.com/negotiation/{link_id}/fill-questionnaire"
            action_text = "complete your questionnaire or take action"
            body_text = (
                f"Hello,\n\n"
                f"We noticed that your data access request has been inactive for over 30 days.\n\n"
                f"Dataset: {questionnaire_said}\n\n"
                f"To keep your request active, please {action_text} by accessing your Dashboard at: "
                f"{dashboard_url}\n\n"
                f"You have 3 days to take action. If no action is taken within this period, your request will be automatically marked as abandoned.\n\n"
                f"If you no longer need this data or have any questions, please contact our support team at adc@uoguelph.ca.\n\n"
                f"Best regards,\n"
                f"The DRT System"
            )
            html_content = f"""
                <p>Hello,</p>
                <p>We noticed that your data access request has been inactive for over 30 days.</p>
                <p><strong>Dataset:</strong> {questionnaire_said}</p>
                <p>To keep your request active, please {action_text} by accessing your <a href="{dashboard_url}" target="_blank">Dashboard</a>.</p>
                <p><strong>Important:</strong> You have 3 days to take action. If no action is taken within this period, your request will be automatically marked as abandoned.</p>
                <p>If you no longer need this data or have any questions, please contact our support team at adc@uoguelph.ca.</p>
                <p>Best regards,<br>The DRT System</p>
            """
        else:  # owner
            subject = "Data Access Request Review - Action Required"
            dashboard_url = f"https://drt-test.canadacentral.cloudapp.azure.com/negotiation/owner/{link_id}/owner-review"
            action_text = "review and respond to the request"
            body_text = (
                f"Hello,\n\n"
                f"We noticed that a data access request has been waiting for your review for over 30 days.\n\n"
                f"Dataset: {questionnaire_said}\n\n"
                f"To keep this request active, please {action_text} by accessing your review page at: "
                f"{dashboard_url}\n\n"
                f"You have 3 days to take action. If no action is taken within this period, the request will be automatically marked as abandoned.\n\n"
                f"If you have any questions or need assistance, please contact our support team at adc@uoguelph.ca.\n\n"
                f"Best regards,\n"
                f"The DRT System"
            )
            html_content = f"""
                <p>Hello,</p>
                <p>We noticed that a data access request has been waiting for your review for over 30 days.</p>
                <p><strong>Dataset:</strong> {questionnaire_said}</p>
                <p>To keep this request active, please {action_text} by accessing your <a href="{dashboard_url}" target="_blank">Review Page</a>.</p>
                <p><strong>Important:</strong> You have 3 days to take action. If no action is taken within this period, the request will be automatically marked as abandoned.</p>
                <p>If you have any questions or need assistance, please contact our support team at adc@uoguelph.ca.</p>
                <p>Best regards,<br>The DRT System</p>
            """
        
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
        questionnaire_url = f"https://drt-test.canadacentral.cloudapp.azure.com/negotiation/{requestor_link}/fill-questionnaire"
        dashboard_url = "https://drt-test.canadacentral.cloudapp.azure.com/negotiation/homepage"
        
        msg = EmailMultiAlternatives(
            subject="Data Access Request - Abandoned",
            body=(
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
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[requestor_email],
        )
        html_content = f"""
            <p>Hello,</p>
            <p>Your data access request has been automatically marked as abandoned due to inactivity.</p>
            <p><strong>Dataset:</strong> {questionnaire_said}</p>
            <p><strong>Reason:</strong> No activity was detected for over 33 days (30 days initial + 3 days grace period).</p>
            <p>If you still need access to this data, you can:</p>
            <ol>
                <li>Continue with this specific request: <a href="{questionnaire_url}" target="_blank">Access Questionnaire</a></li>
                <li>Access your <a href="{dashboard_url}" target="_blank">Dashboard</a> for all requests</li>
            </ol>
            <p>If you have any questions or need assistance, please contact our support team at adc@uoguelph.ca.</p>
            <p>Best regards,<br>The DRT System</p>
        """
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
