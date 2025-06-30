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
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
import datetime
import logging
from .utils import verify_magic_link
import secrets

logger = logging.getLogger(__name__)


@csrf_exempt
@api_view(['GET'])
def test_endpoint(request):
    """Simple test endpoint to check if the server is working"""
    return Response({'message': 'Test endpoint working'}, status=200)


@csrf_exempt
@api_view(['POST'])
def owner_email_entry(request):
    try:
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required'}, status=400)
        try:
            validate_email(email)
        except ValidationError:
            return Response({'error': 'Invalid email'}, status=400)

        # Retrieve owner_id from the owner_table cache using the email
        raw_owner_cache = cache.get("owner_table") or {}
        owner_ids = [
            owner_id
            for owner_id, info in raw_owner_cache.items()
            if info.get("owner_email") == email
        ]
        if not owner_ids:
            return Response({'error': 'Owner not found for this email.'}, status=404)
        owner_id = owner_ids[0]  # Use the first matching owner_id

        # Generate a secure random token for the magic link
        token = secrets.token_urlsafe(32)
        expiry = timezone.now() + datetime.timedelta(minutes=10)

        cache.set(f"owner_auth:{email}", {'uid': owner_id, 'token': token, 'expiry': expiry}, 600)

        magic_link = f"{settings.FRONTEND_BASE_URL}/negotiation/owner/verify-magic-link?uid={owner_id}&token={token}&email={email}"

        try:
            EmailMultiAlternatives(
                subject="Magic Link for Owner Verification",
                body=(
                    "Hello,\n\n"
                    "Click the link below to verify your email and access the owner dashboard:\n\n"
                    f"    {magic_link}\n\n"
                    f"This link will expire at {expiry:%H:%M}.\n\n"
                    "For your security, please do not share this link with anyone. "
                    "If you did not request this link, simply ignore this message or "
                    "contact our support team at ssanavi@uoguelph.ca.\n\n"
                    "Best regards,\n"
                    "The DRT System"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[email],
            ).send(fail_silently=False)
        except Exception as email_error:
            logger.error(f"Email sending failed: {str(email_error)}")
            return Response({'error': 'Failed to send email. Please try again later.'}, status=500)

        return Response({'message': 'Magic link sent to your email'}, status=200)
        
    except Exception as e:
        logger.error(f"Error in owner_email_entry: {str(e)}")
        return Response({'error': f'Internal server error: {str(e)}'}, status=500)


@csrf_exempt
@api_view(["POST"])
def verify_owner_magic_link(request):
    try:
        email = request.data.get('email')
        uid = request.data.get('uid')
        token = request.data.get('token')

        if not email or not uid or not token:
            return Response({"error": "Missing required parameters"}, status=400)

        entry = cache.get(f"owner_auth:{email}")

        if not entry or timezone.now() > entry["expiry"]:
            return Response({"error": "Magic link expired"}, status=400)

        if entry["uid"] != uid or entry["token"] != token:
            return Response({"error": "Invalid magic link"}, status=400)

        if not verify_magic_link(email, uid, token):
            return Response({"error": "Invalid magic link"}, status=400)

        # Store owner_email in the Django session (signed cookie)
        request.session["owner_email"] = email

        cache.set(f"owner_logged_in:{email}", True, 3600)

        cache.delete(f"owner_auth:{email}")

        return Response({"message": "verified"}, status=200)

    except Exception as e:
        logger.error(f"Error in verify_owner_magic_link: {str(e)}")
        return Response({'error': 'Internal server error'}, status=500)


@require_GET
def whoami(request):
    owner_email = request.session.get("owner_email")
    if not owner_email:
        return JsonResponse({"email": None}, status=401)
    return JsonResponse({"email": owner_email}, status=200)


@csrf_exempt
@api_view(['POST'])
def req_email_entry(request):
    try:
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required'}, status=400)
        try:
            validate_email(email)
        except ValidationError:
            return Response({'error': 'Invalid email'}, status=400)

        from ..models import Requestor
        requestor, created = Requestor.objects.get_or_create(
            requestor_email=email)
        requestor_id = str(requestor.requestor_id)

        # Generate a secure random token for the magic link
        token = secrets.token_urlsafe(32)
        expiry = timezone.now() + datetime.timedelta(minutes=10)

        cache.set(f"req_auth:{email}", {'uid': requestor_id,
                  'token': token, 'expiry': expiry}, 600)

        magic_link = f"{settings.FRONTEND_BASE_URL}/negotiation/verify-magic-link?uid={requestor_id}&token={token}&email={email}"

        try:
            EmailMultiAlternatives(
                subject="Magic Link for Requestor Verification",
                body=(
                    "Hello Dear Requestor,\n\n"
                    "Click the link below to verify your email and access the dashboard:\n\n"
                    f"    {magic_link}\n\n"
                    f"This link will expire at {expiry:%H:%M}.\n\n"
                    "For your security, please do not share this link with anyone. "
                    "If you did not request this link, simply ignore this message or "
                    "contact our support team at ssanavi@uoguelph.ca.\n\n"
                    "Best regards,\n"
                    "The DRT System"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[email],
            ).send(fail_silently=False)
        except Exception as email_error:
            logger.error(f"Email sending failed: {str(email_error)}")
            return Response({'error': 'Failed to send email. Please try again later.'}, status=500)


        return Response({'message': 'Magic link sent'}, status=200)

    except Exception as e:
        logger.error(f"Error in req_email_entry: {str(e)}")
        return Response({'error': f'Internal server error: {str(e)}'}, status=500)


@csrf_exempt
@api_view(['POST'])
def verify_req_magic_link(request):
    try:
        email = request.data.get('email')
        uid = request.data.get('uid')
        token = request.data.get('token')

        if not email or not uid or not token:
            return Response({"error": "Missing required parameters"}, status=400)

        entry = cache.get(f"req_auth:{email}")

        if not entry or timezone.now() > entry["expiry"]:
            return Response({"error": "Magic link expired"}, status=400)

        if entry["uid"] != uid or entry["token"] != token:
            return Response({"error": "Invalid magic link"}, status=400)

        if not verify_magic_link(email, uid, token):
            return Response({"error": "Invalid magic link"}, status=400)

        # Store requestor_email in the Django session (signed cookie)
        request.session["requestor_email"] = email

        cache.set(f"req_logged_in:{email}", True, 3600)

        cache.delete(f"req_auth:{email}")

        return Response({'message': 'verified'}, status=200)

    except Exception as e:
        logger.error(f"Error in verify_req_magic_link: {str(e)}")
        return Response({'error': 'Internal server error'}, status=500)


@require_GET
def req_whoami(request):
    requestor_email = request.session.get("requestor_email")
    if not requestor_email:
        return JsonResponse({"email": None}, status=401)
    return JsonResponse({"email": requestor_email}, status=200)
