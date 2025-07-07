from django.urls import reverse
from django.core.cache import cache
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework.decorators import api_view
from rest_framework import status
from rest_framework.response import Response
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from datetime import timedelta
from ..models import Requestor, NLink
import secrets
import logging

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

        try:
            msg = EmailMultiAlternatives(
                subject="Access Link Verification (Resent)",
                body=(
                    "Hello,\n\n"
                    "Click the link below to verify your email:\n\n"
                    f"    {magic_link}\n\n"
                    "For your security, please do not share this link with anyone. "
                    "If you did not request this link, simply ignore this message or "
                    "contact our support team at ssanavi@uoguelph.ca.\n\n"
                    "Best regards,\n"
                    "The DRT System"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[requestor.requestor_email],
                headers={"Reply-To": settings.DEFAULT_FROM_EMAIL},
            )
            msg.send(fail_silently=False)
        except Exception:
            return Response(
                {'error': 'Unable to send access link email. Please try again later.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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

        # Clear cache
        cache.delete(f"magic_token:{token}")
        cache.delete(email_link_key)

        # Optionally, set session/cookie here if needed

        access_url = reverse('request_access', kwargs={'link_id': link_id})
        return Response({'redirect_url': access_url})

    return Response({'error': 'Method not allowed.'},
                    status=status.HTTP_405_METHOD_NOT_ALLOWED)
