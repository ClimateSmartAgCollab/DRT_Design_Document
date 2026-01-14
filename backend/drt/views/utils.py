# drt\views\utils.py

from functools import wraps
from django.http import JsonResponse

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

