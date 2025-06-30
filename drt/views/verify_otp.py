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
from .utils import generate_magic_link
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
        # Generate new magic link
        user_id = hash(requestor.requestor_email)
        uid, token = generate_magic_link(requestor.requestor_email, user_id)
        
        # Update expiry
        requestor.otp_expiry = timezone.now() + timedelta(minutes=10)
        requestor.otp = token  # Store new token
        requestor.save()

        # Store in cache
        cache.set(f"req_auth:{requestor.requestor_email}", 
                 {'uid': uid, 'token': token, 'expiry': requestor.otp_expiry}, 600)

        # Create magic link URL
        magic_link = f"{settings.FRONTEND_BASE_URL}/negotiation/verify-magic-link?uid={uid}&token={token}&email={requestor.requestor_email}"

        try:
            msg = EmailMultiAlternatives(
                subject="Magic Link Verification (Resent)",
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
                {'error': 'Unable to send magic link email. Please try again later.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response({'message': 'Magic link resent successfully.'},
                        status=status.HTTP_200_OK)

    # --- POST: verify submitted magic link ---
    if request.method == 'POST':
        email = request.data.get('email')
        uid = request.data.get('uid')
        token = request.data.get('token')
        
        if timezone.now() > requestor.otp_expiry:
            return Response({'error': 'Magic link expired. Please resend and try again.'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Verify the token matches what's stored
        if requestor.otp == token:
            requestor.is_verified = True
            requestor.otp_expiry = timezone.now()
            requestor.save()
            
            # Clear cache
            cache.delete(f"req_auth:{email}")
            
            access_url = reverse('request_access', kwargs={'link_id': link_id})
            return Response({'redirect_url': access_url})
        else:
            return Response({'error': 'Invalid magic link. Please try again.'},
                            status=status.HTTP_400_BAD_REQUEST)

    return Response({'error': 'Method not allowed.'},
                    status=status.HTTP_405_METHOD_NOT_ALLOWED)
