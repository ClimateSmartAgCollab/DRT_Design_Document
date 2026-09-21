"""Bind a logged-in session to a negotiation row.

UUID ``owner_link`` / ``requestor_link`` values are bookmarks, not
credentials. Callers still require ``owner_auth_required`` or
``requestor_auth_required`` (or an explicit session check) so a missing
session is 401; these helpers return 403 when the session is for a
different party.
"""

from django.core.cache import cache
from django.core.exceptions import ObjectDoesNotExist
from django.http import JsonResponse

from datastore.cache_keys import KEY_OWNER_TABLE

ERROR_UNAUTHENTICATED = {"error": "Authentication required"}
ERROR_UNAUTHORIZED = {"error": "Unauthorized access to this negotiation"}
ERROR_NO_LINK = {"error": "Negotiation link not found"}


def emails_match(left, right):
    a = (left or "").strip().lower()
    b = (right or "").strip().lower()
    return bool(a) and a == b


def nlink_for(negotiation):
    if negotiation is None:
        return None
    try:
        return negotiation.link
    except ObjectDoesNotExist:
        return None


def owner_email_for_nlink(nlink):
    if nlink is None:
        return None
    owner_table = cache.get(KEY_OWNER_TABLE) or {}
    info = owner_table.get(nlink.owner_id) or {}
    return info.get("owner_email")


def session_owns_nlink(session_email, nlink):
    return emails_match(session_email, owner_email_for_nlink(nlink))


def session_is_requestor_of(session_email, nlink):
    if nlink is None:
        return False
    return emails_match(session_email, nlink.requestor_email)


def _resolve_nlink(negotiation=None, nlink=None):
    if nlink is not None:
        return nlink
    return nlink_for(negotiation)


def owner_nlink_or_error(request, negotiation=None, nlink=None):
    nlink = _resolve_nlink(negotiation=negotiation, nlink=nlink)
    if nlink is None:
        return None, JsonResponse(ERROR_NO_LINK, status=404)
    session_email = getattr(request, "owner_email", None) or request.session.get(
        "owner_email"
    )
    if not session_owns_nlink(session_email, nlink):
        return None, JsonResponse(ERROR_UNAUTHORIZED, status=403)
    return nlink, None


def requestor_nlink_or_error(request, negotiation=None, nlink=None):
    nlink = _resolve_nlink(negotiation=negotiation, nlink=nlink)
    if nlink is None:
        return None, JsonResponse(ERROR_NO_LINK, status=404)
    session_email = getattr(request, "requestor_email", None) or request.session.get(
        "requestor_email"
    )
    if not session_is_requestor_of(session_email, nlink):
        return None, JsonResponse(ERROR_UNAUTHORIZED, status=403)
    return nlink, None


def party_nlink_or_error(request, negotiation=None, nlink=None):
    """Owner or requestor of this row. Used by archive and delete."""
    owner_email = getattr(request, "owner_email", None) or request.session.get(
        "owner_email"
    )
    requestor_email = getattr(request, "requestor_email", None) or request.session.get(
        "requestor_email"
    )
    if not owner_email and not requestor_email:
        return None, JsonResponse(ERROR_UNAUTHENTICATED, status=401)
    nlink = _resolve_nlink(negotiation=negotiation, nlink=nlink)
    if nlink is None:
        return None, JsonResponse(ERROR_NO_LINK, status=404)
    if owner_email and session_owns_nlink(owner_email, nlink):
        return nlink, None
    if requestor_email and session_is_requestor_of(requestor_email, nlink):
        return nlink, None
    return None, JsonResponse(ERROR_UNAUTHORIZED, status=403)
