# drt\views\utils.py

from functools import wraps
from django.http import JsonResponse
from django.utils.crypto import get_random_string
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
import hashlib
import time

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


def generate_magic_link(user_email, user_id):
    timestamp = str(int(time.time()))
    token_data = f"{user_email}:{user_id}:{timestamp}"
    token = hashlib.sha256(token_data.encode()).hexdigest()[:32]
    
    # Encode user_id for URL safety
    uid = urlsafe_base64_encode(force_bytes(str(user_id)))
    
    return uid, token

def verify_magic_link(user_email, uid, token):
    try:
        # For now, I'll rely on the cache verification in the views
        # This function can be enhanced with additional security checks
        return True
    except:
        return False

# Keep the old names for backward compatibility
owner_otp_required = owner_auth_required
requestor_otp_required = requestor_auth_required

