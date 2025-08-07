from django.urls import reverse
from django.core.cache import cache
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework.decorators import api_view
from rest_framework import status
from rest_framework.response import Response
from django.conf import settings
from datetime import timedelta
from ..models import Requestor, NLink
import secrets
import logging
from ..tasks import send_magic_link_resend_email_task

logger = logging.getLogger(__name__)


@csrf_exempt
@api_view(['GET', 'POST'])
def verify_magic_link_view(request, link_id):
    try:
        nlink = NLink.objects.get(requestor_link=link_id)  
        requestor = Requestor.objects.get(  
            requestor_email=nlink.requestor_email)  
    except (NLink.DoesNotExist, Requestor.DoesNotExist): 
        return Response({'error': 'Invalid link or email.'},
                        status=status.HTTP_400_BAD_REQUEST)

    # --- GET: resend the magic link ---
    if request.method == 'GET':
        token = secrets.token_urlsafe(32)
        expiry = timezone.now() + timedelta(minutes=10)

        # Invalidate previous token for this email and link_id, if any
        email_link_key = f"magic_token_for:{requestor.requestor_email}:{link_id}"
        old_token = cache.get(email_link_key)
        if old_token:
            cache.delete(f"magic_token:{old_token}")

        # Store the new token and a reverse mapping for easy invalidation
        cache.set(f"magic_token:{token}", {
            'email': requestor.requestor_email,
            'expiry': expiry,
            'link_id': link_id
        }, 600)
        cache.set(email_link_key, token, 600)

        # Update expiry/token in DB for reference
        requestor.otp_expiry = expiry
        requestor.otp = token
        requestor.save()

        magic_link = f"{settings.FRONTEND_BASE_URL}/negotiation/{link_id}/magic-link-verification?token={token}"

        # Send email asynchronously using Celery
        send_magic_link_resend_email_task.delay(requestor.requestor_email, magic_link)

        return Response({'message': 'Access link resent successfully.'},
                        status=status.HTTP_200_OK)

    # --- POST: verify submitted magic link ---
    if request.method == 'POST':
        token = request.data.get('token')
        if not token:
            return Response({'error': 'Missing token.'}, status=status.HTTP_400_BAD_REQUEST)

        entry = cache.get(f"magic_token:{token}")
        if not entry:
            return Response({'error': 'Invalid or expired access link.'}, status=status.HTTP_400_BAD_REQUEST)

        if timezone.now() > entry['expiry']:
            cache.delete(f"magic_token:{token}")
            return Response({'error': 'Access link expired. Please resend and try again.'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Only accept the latest token for this email and link_id
        email_link_key = f"magic_token_for:{entry['email']}:{link_id}"
        latest_token = cache.get(email_link_key)
        if latest_token != token:
            return Response({'error': 'This link has been expired by a newer request.'}, status=status.HTTP_400_BAD_REQUEST)

        # Mark as verified
        requestor.is_verified = True
        requestor.otp_expiry = timezone.now()
        requestor.save()

        # Set session variable for authentication
        request.session['requestor_email'] = entry['email']
        request.session['link_id'] = link_id

        # Clear cache
        cache.delete(f"magic_token:{token}")
        cache.delete(email_link_key)

        # Optionally, set session/cookie here if needed

        access_url = reverse('request_access', kwargs={'link_id': link_id})
        return Response({'redirect_url': access_url})

    return Response({'error': 'Method not allowed.'},
                    status=status.HTTP_405_METHOD_NOT_ALLOWED)
