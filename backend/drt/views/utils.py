# drt\views\utils.py

from functools import wraps
from django.http import JsonResponse
from rest_framework.authentication import SessionAuthentication


class CSRFEnforcedSessionAuthentication(SessionAuthentication):
    """Run Django's CSRF check on DRF views that mutate session state.

    DRF marks every ``@api_view`` as ``csrf_exempt`` at the middleware level
    and only runs the CSRF check inside ``SessionAuthentication`` when a
    ``django.contrib.auth`` user is authenticated. This project authenticates
    with its own session keys (``owner_email`` / ``requestor_email`` /
    ``admin_email``) instead of ``request.user``, so the stock check never
    fires. Calling ``enforce_csrf`` unconditionally restores CSRF protection
    on the endpoints that write to the session, without changing the custom
    magic-link auth flow.
    """

    def authenticate(self, request):
        self.enforce_csrf(request)
        return None

def owner_auth_required(view_func):
    @wraps(view_func)
    def _wrapped(request, *args, **kwargs):
        owner_email = request.session.get("owner_email")
        if not owner_email:
            return JsonResponse({"error": "Owner authentication required"}, status=401)
        request.owner_email = owner_email
        return view_func(request, *args, **kwargs)
    return _wrapped


def requestor_auth_required(view_func):
    @wraps(view_func)
    def _wrapped(request, *args, **kwargs):
        requestor_email = request.session.get("requestor_email")
        if not requestor_email:
            return JsonResponse({"error": "Requestor authentication required"}, status=401)
        request.requestor_email = requestor_email
        return view_func(request, *args, **kwargs)
    return _wrapped


# Keep the old names for backward compatibility
owner_otp_required = owner_auth_required
requestor_otp_required = requestor_auth_required


def admin_auth_required(view_func):
    """
    Decorator to require admin authentication.
    
    Checks that the request has a valid admin_email in the session
    and that the email is in the ADMIN_EMAILS environment variable.
    
    Usage:
        @admin_auth_required
        def admin_dashboard(request):
            # request.admin_email is available here
            return JsonResponse({"data": "..."})
    """
    @wraps(view_func)
    def _wrapped(request, *args, **kwargs):
        from ..utils.admin_helpers import is_admin_email
        
        admin_email = request.session.get("admin_email")
        if not admin_email:
            return JsonResponse({
                "error": "Admin authentication required"
            }, status=401)
        
        # Verify email is still in admin list (reads from environment)
        if not is_admin_email(admin_email):
            return JsonResponse({
                "error": "Unauthorized admin access"
            }, status=403)
        
        # Attach to request for easy access
        request.admin_email = admin_email
        return view_func(request, *args, **kwargs)
    return _wrapped

