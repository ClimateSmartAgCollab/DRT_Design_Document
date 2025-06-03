# drt/views/auth.py

from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.utils import timezone
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from django.core.cache import cache
import datetime

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


@csrf_exempt
@api_view(["POST"])
def verify_owner_otp(request, email):
    entry = cache.get(f"owner_auth:{email}")
    otp_submitted = request.data.get("otp")

    if not entry or timezone.now() > entry["expiry"]:
        return Response({"error": "OTP expired"}, status=400)

    if entry["otp"] != otp_submitted:
        return Response({"error": "Wrong OTP"}, status=400)

    # Store owner_email in the Django session (signed cookie)
    request.session["owner_email"] = email

    # Optionally set a short-lived cache flag, if you need it
    cache.set(f"owner_logged_in:{email}", True, 3600)

    return Response({"message": "verified"}, status=200)


@require_GET
def whoami(request):
    owner_email = request.session.get("owner_email")
    if not owner_email:
        return JsonResponse({"email": None}, status=401)
    return JsonResponse({"email": owner_email}, status=200)



@csrf_exempt
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


@csrf_exempt
@api_view(['POST'])
def verify_req_otp(request, email):
    entry = cache.get(f"req_auth:{email}")
    otp_sub = request.data.get('otp')
    if not entry or timezone.now() > entry['expiry']:
        return Response({'error': 'OTP expired'}, status=400)
    if entry['otp'] != otp_sub:
        return Response({'error': 'Wrong OTP'}, status=400)
    
    # just store the email in the *signed cookie* session:
    request.session["requestor_email"] = email    

    # mark as “logged in” (e.g. set a short‐lived token or flag in cache)
    cache.set(f"req_logged_in:{email}", True, 3600)
    return Response({'message': 'verified'}, status=200)


@require_GET
def req_whoami(request):
    requestor_email = request.session.get("requestor_email")
    if not requestor_email:
        return JsonResponse({"email": None}, status=401)
    return JsonResponse({"email": requestor_email}, status=200)