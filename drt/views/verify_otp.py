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
import datetime
from ..models import Requestor, NLink
import logging
logger = logging.getLogger(__name__)


@csrf_exempt
@api_view(['GET', 'POST'])
def verify_otp(request, link_id):
    try:
        nlink = NLink.objects.get(requestor_link=link_id)
        requestor = Requestor.objects.get(
            requestor_email=nlink.requestor_email)
    except (NLink.DoesNotExist, Requestor.DoesNotExist):
        return Response({'error': 'Invalid link or email.'},
                        status=status.HTTP_400_BAD_REQUEST)

    # --- GET: resend the existing OTP ---
    if request.method == 'GET':
        # optionally bump expiry
        requestor.otp_expiry = timezone.now() + datetime.timedelta(minutes=10)
        requestor.save()

        try:
            msg = EmailMultiAlternatives(
                subject="One-Time Password Verification",
                body=(
                    "Hello,\n\n"
                    f"Your one-time password (OTP) is:\n\n"
                    f"    {otp}\n\n"
                    "For your security, please do not share this code with anyone. "
                    "If you did not request this OTP, simply ignore this message or "
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
                {'error': 'Unable to send OTP email. Please try again later.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # print(f"Resent OTP to {requestor.requestor_email}: {requestor.otp}")

        return Response({'message': 'OTP resent successfully.'},
                        status=status.HTTP_200_OK)

    # --- POST: check submitted OTP ---
    if request.method == 'POST':
        otp = request.data.get('otp')
        if timezone.now() > requestor.otp_expiry:
            return Response({'error': 'OTP expired. Please resend and try again.'},
                            status=status.HTTP_400_BAD_REQUEST)

        if requestor.otp == otp:
            requestor.is_verified = True
            requestor.otp_expiry = timezone.now()
            requestor.save()
            access_url = reverse('request_access', kwargs={'link_id': link_id})
            return Response({'redirect_url': access_url})
        else:
            return Response({'error': 'Invalid OTP. Please try again.'},
                            status=status.HTTP_400_BAD_REQUEST)

    return Response({'error': 'Method not allowed.'},
                    status=status.HTTP_405_METHOD_NOT_ALLOWED)
