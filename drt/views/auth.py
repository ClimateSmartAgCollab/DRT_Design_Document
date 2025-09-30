# drt/views/auth.py

import os
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
import datetime
import logging
import secrets
from ..tasks import send_owner_email_task, send_requestor_email_task

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
        target_url = request.data.get('target_url')  # Optional target URL
        
        if not email:
            return Response({'error': 'Email is required'}, status=400)
        try:
            validate_email(email)
        except ValidationError:
            return Response({'error': 'Invalid email'}, status=400)

        # Generate a secure random token for the magic link
        token = secrets.token_urlsafe(32)
        ttl_minutes = getattr(settings, 'MAGIC_LINK_TTL_MINUTES', 10)
        expiry = timezone.now() + datetime.timedelta(minutes=ttl_minutes)

        # Use a scoped mapping per target to avoid invalidating other links for the same owner
        token_data = {'email': email, 'expiry': expiry}
        cache_timeout = ttl_minutes * 60
        if target_url:
            token_data['target_url'] = target_url
            scoped_key = f"magic_token_for:{email}:{target_url}"
            old_token = cache.get(scoped_key)
            if old_token:
                cache.delete(f"magic_token:{old_token}")
            cache.set(f"magic_token:{token}", token_data, cache_timeout)
            cache.set(scoped_key, token, cache_timeout)
        else:
            # Backward-compatible behavior if no target is provided (single latest per email)
            old_token = cache.get(f"magic_token_for:{email}")
            if old_token:
                cache.delete(f"magic_token:{old_token}")
            cache.set(f"magic_token:{token}", token_data, cache_timeout)
            cache.set(f"magic_token_for:{email}", token, cache_timeout)

        magic_link = f"{settings.FRONTEND_BASE_URL}/negotiation/owner/verify-magic-link?token={token}"

        logger.info(
            "OWNER_EMAIL_ENTRY (request): ENVIRONMENT=%r, EMAIL_BACKEND=%r, "
            "EMAIL_HOST=%r, EMAIL_HOST_USER=%r",
            os.getenv("ENVIRONMENT"),
            settings.EMAIL_BACKEND,
            settings.EMAIL_HOST,
            settings.EMAIL_HOST_USER,
        )

        try:
            # Use Celery to send email asynchronously
            send_owner_email_task.delay(email, magic_link, expiry)
        except Exception as email_error:
            logger.exception("Email sending failed")
            # Return the real SMTP exception to the client for now
            return Response({'error': str(email_error)}, status=500)

        return Response({'message': 'Access link sent to your email'}, status=200)

    except Exception as e:
        logger.error(f"Error in owner_email_entry: {str(e)}")
        return Response({'error': f'Internal server error: {str(e)}'}, status=500)


@csrf_exempt
@api_view(["POST"])
def verify_owner_magic_link(request):
    try:
        token = request.data.get('token')
        if not token:
            return Response({"error": "Missing required parameters"}, status=400)

        entry = cache.get(f"magic_token:{token}")
        if not entry:
            return Response({"error": "Access link expired", "dashboard_url": f"{settings.FRONTEND_BASE_URL}/negotiation/owner/homepage"}, status=400)
        if timezone.now() > entry["expiry"]:
            return Response({"error": "Access link expired", "dashboard_url": f"{settings.FRONTEND_BASE_URL}/negotiation/owner/homepage"}, status=400)

        email = entry["email"]

        # Ensure this token is the latest for this email and target (if provided)
        target_url = entry.get('target_url')
        if target_url:
            latest_token = cache.get(f"magic_token_for:{email}:{target_url}")
        else:
            latest_token = cache.get(f"magic_token_for:{email}")
        if latest_token != token:
            return Response({"error": "This link has been expired by a newer request."}, status=400)

        # Store owner_email in the Django session (signed cookie)
        request.session["owner_email"] = email
        cache.set(f"owner_logged_in:{email}", True, 3600)
        
        # Get target URL if it exists
        target_url = entry.get('target_url')

        # Delete only this token and its scoped mapping
        cache.delete(f"magic_token:{token}")
        if target_url:
            cache.delete(f"magic_token_for:{email}:{target_url}")
        else:
            cache.delete(f"magic_token_for:{email}")
        logger.info(f"Access link verified for {email} at {timezone.now()}")
        
        response_data = {"message": "verified"}
        if target_url:
            response_data["target_url"] = target_url
            
        return Response(response_data, status=200)

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
        ttl_minutes = getattr(settings, 'MAGIC_LINK_TTL_MINUTES', 10)
        expiry = timezone.now() + datetime.timedelta(minutes=ttl_minutes)

        # Invalidate previous token for this email, if any
        old_token = cache.get(f"magic_token_for:{email}")
        if old_token:
            cache.delete(f"magic_token:{old_token}")

        # Store the new token and a reverse mapping for easy invalidation
        cache_timeout = ttl_minutes * 60
        cache.set(f"magic_token:{token}", {
                  'email': email, 'expiry': expiry}, cache_timeout)
        cache.set(f"magic_token_for:{email}", token, cache_timeout)

        magic_link = f"{settings.FRONTEND_BASE_URL}/negotiation/verify-magic-link?token={token}"
        
        logger.info(
            "REQ_EMAIL_ENTRY (request): ENVIRONMENT=%r, EMAIL_BACKEND=%r, "
            "EMAIL_HOST=%r, EMAIL_HOST_USER=%r",
            os.getenv("ENVIRONMENT"),
            settings.EMAIL_BACKEND,
            settings.EMAIL_HOST,
            settings.EMAIL_HOST_USER,
        )
        try:
            # Use Celery to send email asynchronously
            send_requestor_email_task.delay(email, magic_link, expiry)
        except Exception as email_error:
            logger.exception("Email sending failed")
            # Return the real SMTP exception to the client for now
            return Response({'error': str(email_error)}, status=500)
        
        return Response({'message': 'Access link sent'}, status=200)

    except Exception as e:
        logger.error(f"Error in req_email_entry: {str(e)}")
        return Response({'error': f'Internal server error: {str(e)}'}, status=500)


@csrf_exempt
@api_view(['POST'])
def verify_req_magic_link(request):
    try:
        token = request.data.get('token')
        if not token:
            return Response({"error": "Missing required parameters"}, status=400)

        entry = cache.get(f"magic_token:{token}")
        if not entry or timezone.now() > entry["expiry"]:
            return Response({"error": "Access link expired"}, status=400)

        email = entry["email"]
        if not email:
            return Response({"error": "Invalid Access link"}, status=400)

        # Ensure this token is the latest for this email
        latest_token = cache.get(f"magic_token_for:{email}")
        if latest_token != token:
            return Response({"error": "This link has been expired by a newer request."}, status=400)

        # Store requestor_email in the Django session (signed cookie)
        request.session["requestor_email"] = email
        cache.set(f"req_logged_in:{email}", True, 3600)
        cache.delete(f"magic_token:{token}")
        cache.delete(f"magic_token_for:{email}")
        logger.info(f"Access link verified for {email} at {timezone.now()}")
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


def generate_owner_magic_link_with_target(email, target_url):
    """Generate a magic link for owner authentication with a target URL"""
    # Generate a secure random token for the magic link
    token = secrets.token_urlsafe(32)
    ttl_minutes = getattr(settings, 'MAGIC_LINK_TTL_MINUTES', 10)
    expiry = timezone.now() + datetime.timedelta(minutes=ttl_minutes)

    # Invalidate previous token only for this specific target (scoped)
    scoped_key = f"magic_token_for:{email}:{target_url}"
    old_token = cache.get(scoped_key)
    if old_token:
        cache.delete(f"magic_token:{old_token}")

    # Store the new token with target URL and a reverse mapping for easy invalidation
    cache_timeout = ttl_minutes * 60
    cache.set(
        f"magic_token:{token}",
        {'email': email, 'expiry': expiry, 'target_url': target_url},
        cache_timeout,
    )
    cache.set(scoped_key, token, cache_timeout)

    magic_link = f"{settings.FRONTEND_BASE_URL}/negotiation/owner/verify-magic-link?token={token}"
    return magic_link, expiry


@csrf_exempt
@api_view(['POST'])
def owner_logout(request):
    """Logout endpoint for owner users"""
    try:
        owner_email = request.session.get("owner_email")
        if owner_email:
            # Clear session data
            request.session.pop("owner_email", None)
            # Clear cache entry
            cache.delete(f"owner_logged_in:{owner_email}")
            logger.info(f"Owner logged out: {owner_email}")
        
        return Response({'message': 'Logged out successfully'}, status=200)
    except Exception as e:
        logger.error(f"Error in owner_logout: {str(e)}")
        return Response({'error': 'Internal server error'}, status=500)


@csrf_exempt
@api_view(['POST'])
def requestor_logout(request):
    """Logout endpoint for requestor users"""
    try:
        requestor_email = request.session.get("requestor_email")
        if requestor_email:
            # Clear session data
            request.session.pop("requestor_email", None)
            # Clear cache entry
            cache.delete(f"req_logged_in:{requestor_email}")
            logger.info(f"Requestor logged out: {requestor_email}")
        
        return Response({'message': 'Logged out successfully'}, status=200)
    except Exception as e:
        logger.error(f"Error in requestor_logout: {str(e)}")
        return Response({'error': 'Internal server error'}, status=500)
