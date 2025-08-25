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
