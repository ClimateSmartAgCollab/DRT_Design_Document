from django.urls import reverse
from django.core.cache import cache
from django.views.decorators.csrf import csrf_exempt
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
def verify_owner_otp(request, email):
    entry = cache.get(f"owner_auth:{email}")
    otp_sub = request.data.get('otp')
    if not entry or timezone.now() > entry['expiry']:
        return Response({'error': 'OTP expired'}, status=400)
    if entry['otp'] != otp_sub:
        return Response({'error': 'Wrong OTP'}, status=400)

    # just store the email in the *signed cookie* session:
    request.session["owner_email"] = email

    # mark as “logged in” (e.g. set a short‐lived token or flag in cache)
    cache.set(f"owner_logged_in:{email}", True, 3600)
    return Response({'message': 'verified'}, status=200)


@csrf_exempt
@api_view(['POST'])
def verify_req_otp(request, email):
    entry = cache.get(f"req_auth:{email}")
    otp_sub = request.data.get('otp')
    if not entry or timezone.now() > entry['expiry']:
        return Response({'error': 'OTP expired'}, status=400)
    if entry['otp'] != otp_sub:
        return Response({'error': 'Wrong OTP'}, status=400)

    # mark as “logged in” (e.g. set a short‐lived token or flag in cache)
    cache.set(f"req_logged_in:{email}", True, 3600)
    return Response({'message': 'verified'}, status=200)


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

        # try:
        #     msg = EmailMultiAlternatives(
        #         subject='DART System One-Time Password',
        #         body=f'Use OTP: {requestor.otp}',
        #         from_email=settings.DEFAULT_FROM_EMAIL,
        #         to=[requestor.requestor_email],
        #         headers={"Reply-To": settings.DEFAULT_FROM_EMAIL},
        #     )
        #     msg.send(fail_silently=False)
        # except Exception:
        #     return Response(
        #         {'error': 'Unable to send OTP email. Please try again later.'},
        #         status=status.HTTP_500_INTERNAL_SERVER_ERROR
        #     )

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

