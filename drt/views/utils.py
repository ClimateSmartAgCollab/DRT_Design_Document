# drt\views\utils.py

from functools import wraps
from django.http import JsonResponse

def owner_otp_required(view_func):
    @wraps(view_func)
    def _wrapped(request, *args, **kwargs):
        email = request.session.get("owner_email")
        if not email:
            return JsonResponse(
                {"error": "OTP login required"}, status=401
            )
        # attach it for the view:
        request.owner_email = email
        return view_func(request, *args, **kwargs)
    return _wrapped


def requestor_otp_required(view_func):
    @wraps(view_func)
    def _wrapped(request, *args, **kwargs):
        email = request.session.get("requestor_email")
        print(f"Requestor email: {email}")
        if not email:
            return JsonResponse(
                {"error": "OTP login required"}, status=401
            )
        # attach it for the view:
        request.requestor_email = email
        return view_func(request, *args, **kwargs)
    return _wrapped

