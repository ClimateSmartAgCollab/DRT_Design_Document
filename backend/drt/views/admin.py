"""
Admin views for environment-based admin authentication and management.
"""
import os
import secrets
import datetime
import logging
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.utils import timezone
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from rest_framework.decorators import api_view, authentication_classes
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.core.cache import cache
from django.conf import settings
from ..utils.admin_helpers import get_admin_emails, is_admin_email, is_admin_enabled
from ..tasks import send_admin_email_task
from .utils import admin_auth_required, CSRFEnforcedSessionAuthentication

logger = logging.getLogger(__name__)


@csrf_exempt
@api_view(['POST'])
def admin_email_entry(request):
    """
    Request a magic link for admin authentication.
    
    Works exactly like owner_email_entry, but checks ADMIN_EMAILS env var
    instead of database/cache.
    
    Request body:
        {
            "email": "admin@example.com",
            "target_url": "https://..." (optional)
        }
    
    Returns:
        {"message": "Admin access link sent to your email"} on success
        {"error": "..."} on failure
    """
    try:
        # Check if admin functionality is enabled
        if not is_admin_enabled():
            return Response({
                'error': 'Admin functionality is not enabled'
            }, status=403)
        
        email = request.data.get('email')
        target_url = request.data.get('target_url')  # Optional target URL
        
        if not email:
            return Response({'error': 'Email is required'}, status=400)
        
        try:
            validate_email(email)
        except ValidationError:
            return Response({'error': 'Invalid email format'}, status=400)
        
        # KEY DIFFERENCE: Check environment variable instead of database
        if not is_admin_email(email):
            logger.warning(f"Admin access attempt for unauthorized email: {email}")
            return Response({
                'error': 'Email not authorized for admin access'
            }, status=403)
        
        # Generate a secure random token for the magic link
        token = secrets.token_urlsafe(32)
        ttl_minutes = getattr(settings, 'MAGIC_LINK_TTL_MINUTES', 10)
        expiry = timezone.now() + datetime.timedelta(minutes=ttl_minutes)
        
        # Store token in cache (same pattern as owner/requestor, but with admin prefix)
        token_data = {
            'email': email,
            'expiry': expiry,
            'role': 'admin'
        }
        cache_timeout = ttl_minutes * 60
        
        if target_url:
            token_data['target_url'] = target_url
            scoped_key = f"admin_magic_token_for:{email}:{target_url}"
            old_token = cache.get(scoped_key)
            if old_token:
                cache.delete(f"admin_magic_token:{old_token}")
            cache.set(f"admin_magic_token:{token}", token_data, cache_timeout)
            cache.set(scoped_key, token, cache_timeout)
        else:
            # Backward-compatible behavior if no target is provided
            old_token = cache.get(f"admin_magic_token_for:{email}")
            if old_token:
                cache.delete(f"admin_magic_token:{old_token}")
            cache.set(f"admin_magic_token:{token}", token_data, cache_timeout)
            cache.set(f"admin_magic_token_for:{email}", token, cache_timeout)
        
        magic_link = f"{settings.FRONTEND_BASE_URL}/admin/verify-magic-link?token={token}"
        
        logger.info(
            f"Admin email entry request for {email} (ENVIRONMENT={os.getenv('ENVIRONMENT')}, "
            f"EMAIL_BACKEND={settings.EMAIL_BACKEND}, EMAIL_HOST={settings.EMAIL_HOST})"
        )
        
        try:
            send_admin_email_task(email, magic_link, expiry)
        except Exception as email_error:
            logger.exception("Admin email sending failed")
            return Response({'error': f'Failed to send email: {str(email_error)}'}, status=500)
        
        return Response({
            'message': 'Admin access link sent to your email'
        }, status=200)
        
    except Exception as e:
        logger.error(f"Error in admin_email_entry: {str(e)}", exc_info=True)
        return Response({'error': 'Internal server error'}, status=500)


@api_view(["POST"])
@authentication_classes([CSRFEnforcedSessionAuthentication])
def verify_admin_magic_link(request):
    """
    Verify admin magic link token.
    
    Works exactly like verify_owner_magic_link, but stores admin_email in session.
    
    Request body:
        {"token": "..."}
    
    Returns:
        {"message": "verified", "role": "admin", "target_url": "..."} on success
        {"error": "..."} on failure
    """
    try:
        token = request.data.get('token')
        if not token:
            return Response({"error": "Missing required parameters"}, status=400)
        
        # Get token from cache (with admin prefix)
        entry = cache.get(f"admin_magic_token:{token}")
        if not entry:
            return Response({
                "error": "Access link expired",
                "dashboard_url": f"{settings.FRONTEND_BASE_URL}/admin/dashboard"
            }, status=400)
        
        if timezone.now() > entry["expiry"]:
            return Response({
                "error": "Access link expired",
                "dashboard_url": f"{settings.FRONTEND_BASE_URL}/admin/dashboard"
            }, status=400)
        
        email = entry["email"]
        if not email:
            return Response({"error": "Invalid access link"}, status=400)
        
        # DOUBLE CHECK: Verify email is still in admin list
        # (In case env var changed while token was valid)
        if not is_admin_email(email):
            logger.warning(f"Admin token verification failed - email no longer authorized: {email}")
            return Response({
                "error": "Email no longer authorized for admin access"
            }, status=403)
        
        # Ensure this token is the latest for this email and target (if provided)
        target_url = entry.get('target_url')
        if target_url:
            latest_token = cache.get(f"admin_magic_token_for:{email}:{target_url}")
        else:
            latest_token = cache.get(f"admin_magic_token_for:{email}")
        
        if latest_token != token:
            return Response({
                "error": "This link has been expired by a newer request."
            }, status=400)
        
        # Store admin_email in the Django session (signed cookie)
        # Different key from owner/requestor: "admin_email" not "owner_email"
        request.session["admin_email"] = email
        cache.set(f"admin_logged_in:{email}", True, 3600)
        
        # Clean up token
        cache.delete(f"admin_magic_token:{token}")
        if target_url:
            cache.delete(f"admin_magic_token_for:{email}:{target_url}")
        else:
            cache.delete(f"admin_magic_token_for:{email}")
        
        logger.info(f"Admin access link verified for {email} at {timezone.now()}")
        
        response_data = {"message": "verified", "role": "admin"}
        if target_url:
            response_data["target_url"] = target_url
        
        return Response(response_data, status=200)
        
    except Exception as e:
        logger.error(f"Error in verify_admin_magic_link: {str(e)}", exc_info=True)
        return Response({'error': 'Internal server error'}, status=500)


@require_GET
@ensure_csrf_cookie
def admin_whoami(request):
    """
    Get current admin email (if authenticated).
    
    Works exactly like owner/requestor whoami endpoints.
    
    Returns:
        {"email": "...", "role": "admin"} if authenticated
        {"error": "..."} if not authenticated
    """
    admin_email = request.session.get("admin_email")
    
    if not admin_email:
        return JsonResponse({
            "error": "Not authenticated"
        }, status=401)
    
    # Verify still in admin list (security check)
    if not is_admin_email(admin_email):
        return JsonResponse({
            "error": "No longer authorized"
        }, status=403)
    
    return JsonResponse({
        "email": admin_email,
        "role": "admin"
    })


@api_view(['POST'])
@authentication_classes([CSRFEnforcedSessionAuthentication])
def admin_logout(request):
    """
    Logout endpoint for admin users.
    
    Clears the admin_email from session and cache.
    
    Returns:
        {"message": "Logged out successfully"}
    """
    try:
        admin_email = request.session.get("admin_email")
        
        if admin_email:
            # Clear session
            if "admin_email" in request.session:
                del request.session["admin_email"]
            
            # Clear cache
            cache.delete(f"admin_logged_in:{admin_email}")
            
            logger.info(f"Admin logged out: {admin_email}")
        
        return JsonResponse({
            "message": "Logged out successfully"
        })
        
    except Exception as e:
        logger.error(f"Error in admin_logout: {str(e)}", exc_info=True)
        return JsonResponse({
            "error": "Internal server error"
        }, status=500)


@admin_auth_required
@require_GET
def admin_dashboard_stats(request):
    """
    Get system-wide dashboard statistics.
    Only accessible to authenticated admins.
    
    Returns basic system statistics aggregated across all owners.
    """
    try:
        from django.db.models import Count, Q
        from ..models import Negotiation, NLink, Requestor
        
        # Overall counts
        total_negotiations = Negotiation.objects.count()
        total_owners = NLink.objects.values('owner_id').distinct().count()
        total_requestors = Requestor.objects.count()
        link_table = cache.get('link_table') or {}
        total_datasets = len(link_table)  # Active data sharing links (all links owners have in GitHub)
        
        # Negotiation states
        state_counts = Negotiation.objects.values('state').annotate(
            count=Count('negotiation_id')
        )
        state_dict = {item['state']: item['count'] for item in state_counts}
        
        # Recent activity (last 30 days)
        from datetime import timedelta
        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent_negotiations = Negotiation.objects.filter(
            timestamps__gte=thirty_days_ago
        ).count()
        
        return JsonResponse({
            'admin_email': request.admin_email,
            'statistics': {
                'total_negotiations': total_negotiations,
                'total_owners': total_owners,
                'total_requestors': total_requestors,
                'total_datasets': total_datasets,
                'negotiation_states': {
                    'requestor_open': state_dict.get('requestor_open', 0),
                    'owner_open': state_dict.get('owner_open', 0),
                    'accepted': state_dict.get('accepted', 0),
                    'rejected': state_dict.get('rejected', 0),
                    'abandoned': state_dict.get('abandoned', 0),
                    'archived': state_dict.get('archived', 0),
                    'canceled': state_dict.get('canceled', 0),
                },
                'recent_activity': {
                    'negotiations_last_30_days': recent_negotiations,
                },
            },
            'timestamp': timezone.now().isoformat(),
        })
        
    except Exception as e:
        logger.error(f"Error in admin_dashboard_stats: {str(e)}", exc_info=True)
        return JsonResponse({
            'error': 'Failed to retrieve statistics'
        }, status=500)


@admin_auth_required
@require_GET
def admin_health_check(request):
    """
    Comprehensive system health check.
    Only accessible to authenticated admins.
    
    Checks:
    - Database connectivity
    - Redis/Cache connectivity
    - Email configuration
    - Recent activity
    """
    health_status = {
        'timestamp': timezone.now().isoformat(),
        'status': 'healthy',
        'checks': {}
    }
    
    # Database connectivity
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        health_status['checks']['database'] = {
            'status': 'healthy',
            'message': 'Database connection successful'
        }
    except Exception as e:
        health_status['checks']['database'] = {
            'status': 'unhealthy',
            'message': f'Database connection failed: {str(e)}'
        }
        health_status['status'] = 'unhealthy'
    
    # Redis/Cache connectivity
    try:
        cache.set('admin_health_check', 'ok', 10)
        cache_result = cache.get('admin_health_check')
        if cache_result == 'ok':
            health_status['checks']['cache'] = {
                'status': 'healthy',
                'message': 'Cache connection successful'
            }
        else:
            raise Exception("Cache read/write test failed")
    except Exception as e:
        health_status['checks']['cache'] = {
            'status': 'unhealthy',
            'message': f'Cache connection failed: {str(e)}'
        }
        health_status['status'] = 'unhealthy'
    
    # Email configuration
    try:
        if hasattr(settings, 'EMAIL_HOST') and settings.EMAIL_HOST:
            health_status['checks']['email'] = {
                'status': 'healthy',
                'message': 'Email configuration present',
                'host': settings.EMAIL_HOST
            }
        else:
            health_status['checks']['email'] = {
                'status': 'degraded',
                'message': 'Email configuration missing'
            }
    except Exception as e:
        health_status['checks']['email'] = {
            'status': 'unknown',
            'message': f'Email check error: {str(e)}'
        }
    
    # Recent activity check (negotiations in last 24 hours)
    try:
        from datetime import timedelta
        from ..models import Negotiation
        recent_count = Negotiation.objects.filter(
            timestamps__gte=timezone.now() - timedelta(days=1)
        ).count()
        health_status['checks']['recent_activity'] = {
            'status': 'healthy',
            'message': f'{recent_count} negotiations in last 24 hours',
            'count': recent_count
        }
    except Exception as e:
        health_status['checks']['recent_activity'] = {
            'status': 'unknown',
            'message': f'Activity check error: {str(e)}'
        }
    
    # Always return 200 OK - health status is in the JSON body, not the HTTP status code
    return JsonResponse(health_status, status=200)
