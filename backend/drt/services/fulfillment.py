"""Current-cycle fulfillment helpers for Negotiation.

Call these *after* any ``negotiation.save()`` so a full save cannot clobber
the conditional UPDATE with stale in-memory values.
"""

from django.utils import timezone

from ..models import Negotiation

DESC_FULFILLMENT_PENDING = "Owner marked fulfillment pending"
DESC_FULFILLMENT_DELIVERED = "Owner marked access delivered"
DESC_FULFILLMENT_WITHDRAWN = "Owner withdrew access"

DELIVER_FROM = (
    Negotiation.FULFILLMENT_PENDING,
    Negotiation.FULFILLMENT_NOT_APPLICABLE,
)
WITHDRAW_FROM = (
    Negotiation.FULFILLMENT_PENDING,
    Negotiation.FULFILLMENT_DELIVERED,
    Negotiation.FULFILLMENT_NOT_APPLICABLE,
)


def _now(at):
    return at if at is not None else timezone.now()


def _refresh_fulfillment(negotiation):
    row = (
        Negotiation.objects.filter(pk=negotiation.pk)
        .values("fulfillment_status", "fulfillment_note", "fulfillment_at")
        .first()
    )
    if not row:
        return
    negotiation.fulfillment_status = row["fulfillment_status"]
    negotiation.fulfillment_note = row["fulfillment_note"]
    negotiation.fulfillment_at = row["fulfillment_at"]


def mark_pending(negotiation) -> bool:
    """Start a delivery cycle after accept. Overwrites leftover cycle fields."""
    updated = Negotiation.objects.filter(pk=negotiation.pk).update(
        fulfillment_status=Negotiation.FULFILLMENT_PENDING,
        fulfillment_note=None,
        fulfillment_at=None,
    )
    if updated:
        negotiation.fulfillment_status = Negotiation.FULFILLMENT_PENDING
        negotiation.fulfillment_note = None
        negotiation.fulfillment_at = None
        return True
    _refresh_fulfillment(negotiation)
    return False


def mark_delivered(negotiation, *, note=None, at=None) -> bool:
    at = _now(at)
    note = (note or "").strip() or None
    updated = Negotiation.objects.filter(
        pk=negotiation.pk,
        state="accepted",
        fulfillment_status__in=DELIVER_FROM,
    ).update(
        fulfillment_status=Negotiation.FULFILLMENT_DELIVERED,
        fulfillment_at=at,
        fulfillment_note=note,
    )
    if updated:
        negotiation.fulfillment_status = Negotiation.FULFILLMENT_DELIVERED
        negotiation.fulfillment_at = at
        negotiation.fulfillment_note = note
        return True
    _refresh_fulfillment(negotiation)
    return False


def mark_withdrawn(negotiation, *, note=None, at=None) -> bool:
    at = _now(at)
    note = (note or "").strip() or None
    updated = Negotiation.objects.filter(
        pk=negotiation.pk,
        state="accepted",
        fulfillment_status__in=WITHDRAW_FROM,
    ).update(
        fulfillment_status=Negotiation.FULFILLMENT_WITHDRAWN,
        fulfillment_at=at,
        fulfillment_note=note,
    )
    if updated:
        negotiation.fulfillment_status = Negotiation.FULFILLMENT_WITHDRAWN
        negotiation.fulfillment_at = at
        negotiation.fulfillment_note = note
        return True
    _refresh_fulfillment(negotiation)
    return False


def clear_on_reopen(negotiation) -> bool:
    updated = Negotiation.objects.filter(pk=negotiation.pk).update(
        fulfillment_status=Negotiation.FULFILLMENT_NOT_APPLICABLE,
        fulfillment_note=None,
        fulfillment_at=None,
    )
    if not updated:
        return False
    negotiation.fulfillment_status = Negotiation.FULFILLMENT_NOT_APPLICABLE
    negotiation.fulfillment_note = None
    negotiation.fulfillment_at = None
    return True
