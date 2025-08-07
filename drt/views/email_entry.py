from django.conf import settings
from django.shortcuts import get_object_or_404
from django.core.cache import cache
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework.decorators import api_view
from rest_framework import status
from rest_framework.response import Response
import datetime
from ..models import Requestor, NLink
import logging
import secrets
from ..tasks import send_requestor_verification_email_task

logger = logging.getLogger(__name__)


@api_view(['GET', 'POST'])
@ensure_csrf_cookie
@csrf_exempt
def requestor_email_entry(request, link_id):
    try:
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)
        validate_email(email)

        requestor, created = Requestor.objects.update_or_create(
            requestor_email=email,
            defaults={
                'is_verified': False,
            }
        )

        token = secrets.token_urlsafe(32)
        expiry = timezone.now() + datetime.timedelta(minutes=10)

        # Invalidate previous token for this email and link_id, if any
        email_link_key = f"magic_token_for:{email}:{link_id}"
        old_token = cache.get(email_link_key)
        if old_token:
            cache.delete(f"magic_token:{old_token}")

        # Store the new token and a reverse mapping for easy invalidation
        cache.set(f"magic_token:{token}", {
            'email': email, 'expiry': expiry, 'link_id': link_id
        }, 600)
        cache.set(email_link_key, token, 600)

        # Update the Requestor with the new token and expiry
        requestor.otp = token  # Reusing otp field for token
        requestor.otp_expiry = expiry
        requestor.is_verified = False
        requestor.save()

        nlink = get_object_or_404(NLink, requestor_link=link_id)
        nlink.requestor_email = email
        nlink.save(update_fields=['requestor_email'])

        magic_link = f"{settings.FRONTEND_BASE_URL}/negotiation/{link_id}/magic-link-verification?token={token}"

        # Send email asynchronously using Celery
        send_requestor_verification_email_task.delay(email, magic_link, expiry)

        magic_link_path = f"/negotiation/{link_id}/magic-link-verification?token={token}"
        return Response({'redirect_url': settings.FRONTEND_BASE_URL + magic_link_path})

    except ValidationError:
        return Response({'error': 'Please enter a valid email address.'},
                        status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.exception("Error in requestor_email_entry")
        return Response(
            {'error': 'Server error. Check logs for details.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
