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
from django.core.mail import EmailMultiAlternatives
import datetime
from ..models import Requestor, NLink
import logging
logger = logging.getLogger(__name__)



@csrf_exempt
@api_view(['POST'])
def owner_email_entry(request):
    email = request.data.get('email')
    try:
        validate_email(email)
    except ValidationError:
        return Response({'error': 'Invalid email'}, status=400)

    # generate OTP
    otp = "9832"  # for testing
    # uncomment the next line for production
    # otp = get_random_string(6, '0123456789')

    expiry = timezone.now() + datetime.timedelta(minutes=10)
    # store in cache under "owner_auth:{email}"
    cache.set(f"owner_auth:{email}", {'otp': otp, 'expiry': expiry}, 600)

    # # send it
    # EmailMultiAlternatives(
    #   subject="Your Owner OTP",
    #   body=f"Your OTP is {otp}. Expires at {expiry:%H:%M}.",
    #   from_email=settings.DEFAULT_FROM_EMAIL,
    #   to=[email],
    # ).send(fail_silently=False)

    return Response({'message': 'OTP sent'}, status=200)


# @csrf_exempt
@api_view(['POST'])
def req_email_entry(request):
    email = request.data.get('email')
    try:
        validate_email(email)
    except ValidationError:
        return Response({'error': 'Invalid email'}, status=400)

    # generate OTP
    otp = "9832"  # for testing
    # uncomment the next line for production
    # otp = get_random_string(6, '0123456789')

    expiry = timezone.now() + datetime.timedelta(minutes=10)
    # store in cache under "req_auth:{email}"
    cache.set(f"req_auth:{email}", {'otp': otp, 'expiry': expiry}, 600)
    print(f"OTP for {email}: {otp}")  # <-- debug
    print(f"Your OTP is {otp}. Expires at {expiry:%H:%M}.")  # <-- debug

    # # send it
    # EmailMultiAlternatives(
    #   subject="Your Req OTP",
    #   body=f"Your OTP is {otp}. Expires at {expiry:%H:%M}.",
    #   from_email=settings.DEFAULT_FROM_EMAIL,
    #   to=[email],
    # ).send(fail_silently=False)

    return Response({'message': 'OTP sent'}, status=200)


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

        # generate + store OTP
        otp = "9832"  # for testing
        # uncomment the next line for production
        # otp = get_random_string(6, '0123456789')

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

        # build and send the email
        subject = "DART System One-Time Password"
        text_content = (
            f"Hello,\n\n"
            f"Your one-time password (OTP) is:\n\n    {otp}\n\n"
            f"It expires at {expiry:%Y-%m-%d %H:%M:%S}.\n\n"
            f"— DART System Team"
        )
        # msg = EmailMultiAlternatives(
        #     subject=subject,
        #     body=text_content,
        #     from_email=settings.DEFAULT_FROM_EMAIL,
        #     to=[email],
        #     headers={'Reply-To': settings.DEFAULT_FROM_EMAIL},
        # )
        # msg.send(fail_silently=False)

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

