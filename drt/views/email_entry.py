from django.conf import settings
from django.shortcuts import get_object_or_404
from django.urls import reverse
from django.core.cache import cache
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework.decorators import api_view
from rest_framework import status
from rest_framework.response import Response
from django.utils.crypto import get_random_string
from django.core.mail import EmailMultiAlternatives
import datetime
from ..models import Requestor, NLink
import logging
logger = logging.getLogger(__name__)


@api_view(['GET', 'POST'])
@ensure_csrf_cookie      # on a GET it will set csrftoken
@csrf_exempt             # only if you reorder so this still applies
def requestor_email_entry(request, link_id):
    try:
        # grab & validate
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)
        validate_email(email)

        # generate OTP
        if settings.ENVIRONMENT == 'production':
            otp = get_random_string(6, '0123456789')
        else:
            # in staging/testing we can still generate random, but you can stub if you like:
            otp = get_random_string(6, '0123456789')
            # or: otp = "9832"

        expiry = timezone.now() + datetime.timedelta(minutes=10)
        # find or make the Requestor, then reset its OTP & expiry
        requestor, created = Requestor.objects.update_or_create(
            requestor_email=email,
            defaults={
                'otp': otp,
                'otp_expiry': expiry,
                'is_verified': False,
            }
        )
        nlink = get_object_or_404(NLink, requestor_link=link_id)
        nlink.requestor_email = email
        nlink.save(update_fields=['requestor_email'])

        msg = EmailMultiAlternatives(
            subject="One-Time Password for Requestor Verification",
            body=(
                "Hello Dear Requestor,\n\n"
                f"Your one-time password (OTP) is:\n\n"
                f"    {otp}\n\n"
                f"This code will expire at {expiry:%H:%M}.\n\n"
                "For your security, please do not share this code with anyone. "
                "If you did not request this OTP, simply ignore this message or "
                "contact our support team at ssanavi@uoguelph.ca.\n\n"
                "Best regards,\n"
                "The DRT System"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[email],
            headers={'Reply-To': settings.DEFAULT_FROM_EMAIL},
        )
        msg.send(fail_silently=False)

        # return the frontend redirect
        otp_path = reverse('verify_otp', kwargs={'link_id': link_id})
        return Response({'redirect_url': settings.FRONTEND_BASE_URL + otp_path})

    except ValidationError:
        return Response({'error': 'Please enter a valid email address.'},
                        status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.exception("Error in requestor_email_entry")
        return Response(
            {'error': 'Server error. Check logs for details.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
