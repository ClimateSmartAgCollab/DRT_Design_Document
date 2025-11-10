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

