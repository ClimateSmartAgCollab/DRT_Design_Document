# drt\views\utils.py

from functools import wraps
from django.http import JsonResponse
from rest_framework.authentication import SessionAuthentication

from drt.utils.admin_helpers import admin_auth_required


def csrf_failure(request, reason=""):
    """JSON 403 for the SPA instead of Django's HTML CSRF page."""
    return JsonResponse(
        {"error": "CSRF verification failed", "detail": reason},
        status=403,
    )


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

