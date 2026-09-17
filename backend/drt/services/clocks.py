"""Case-clock helpers for Negotiation.

Write-once fields use a conditional UPDATE so concurrent GET/save/decide
cannot both win. Call these *after* any ``negotiation.save()`` so a full
save cannot clobber the UPDATE with stale in-memory None values.
"""

from collections import defaultdict

from django.db import transaction
from django.db.models import F
from django.utils import timezone

from ..models import Archive, Negotiation

DESC_SUBMITTED = "Requestor submitted questionnaire responses"
DESC_OWNER_SAVED = "Owner saved review"
DESC_OWNER_ACCEPTED = "Owner accepted"
DESC_OWNER_REJECTED = "Owner rejected"
DESC_OWNER_CLARIFICATION = "Owner requested clarification"
DESC_ABANDONED_INACTIVITY = (
    "Negotiation marked as abandoned due to inactivity (30+ days)"
)
DESC_ABANDONED_REQUESTOR = "Negotiation abandoned by requestor"
DESC_REOPENED_PREFIX = "Owner reopened negotiation from"

# Load-bearing: reversing this order inverts write-once clocks on backfill.
ARCHIVE_CLOCK_ORDER = ("archived_timestamp", "id")

FIRST_LOOK_DESCRIPTIONS = frozenset({
    DESC_OWNER_SAVED,
    DESC_OWNER_ACCEPTED,
    DESC_OWNER_REJECTED,
    DESC_OWNER_CLARIFICATION,
})
DECIDED_DESCRIPTIONS = frozenset({DESC_OWNER_ACCEPTED, DESC_OWNER_REJECTED})
ABANDONED_DESCRIPTIONS = frozenset({
    DESC_ABANDONED_INACTIVITY,
    DESC_ABANDONED_REQUESTOR,
})

CLOCK_SNAPSHOT_FIELDS = (
    "submitted_at",
    "first_owner_open_at",
    "decided_at",
    "abandoned_at",
    "reopen_count",
    "reminder_sent",
    "reminder_sent_date",
)


def reopen_description(previous_state: str) -> str:
    return f"{DESC_REOPENED_PREFIX} {previous_state} state"


def is_reopen_description(change_description: str) -> bool:
    return (change_description or "").startswith(DESC_REOPENED_PREFIX)


def _now(at):
    return at if at is not None else timezone.now()


def mark_submitted(negotiation, at=None) -> bool:
    at = _now(at)
    updated = Negotiation.objects.filter(
        pk=negotiation.pk,
        submitted_at__isnull=True,
    ).update(submitted_at=at)
    if updated:
        negotiation.submitted_at = at
        return True
    if negotiation.submitted_at is None:
        negotiation.submitted_at = (
            Negotiation.objects.filter(pk=negotiation.pk)
            .values_list("submitted_at", flat=True)
            .first()
        )
    return False


def mark_first_owner_open(negotiation, at=None) -> bool:
    at = _now(at)
    updated = Negotiation.objects.filter(
        pk=negotiation.pk,
        first_owner_open_at__isnull=True,
    ).update(first_owner_open_at=at)
    if updated:
        negotiation.first_owner_open_at = at
        return True
    if negotiation.first_owner_open_at is None:
        negotiation.first_owner_open_at = (
            Negotiation.objects.filter(pk=negotiation.pk)
            .values_list("first_owner_open_at", flat=True)
            .first()
        )
    return False


def mark_decided(negotiation, at=None) -> bool:
    at = _now(at)
    updated = Negotiation.objects.filter(pk=negotiation.pk).update(
        decided_at=at,
        abandoned_at=None,
    )
    if updated:
        negotiation.decided_at = at
        negotiation.abandoned_at = None
    return updated == 1


def mark_abandoned(negotiation, at=None) -> bool:
    at = _now(at)
    updated = Negotiation.objects.filter(pk=negotiation.pk).update(
        abandoned_at=at,
    )
    if updated:
        negotiation.abandoned_at = at
    return updated == 1


def mark_reopened(negotiation) -> bool:
    updated = Negotiation.objects.filter(pk=negotiation.pk).update(
        decided_at=None,
        abandoned_at=None,
        reminder_sent=False,
        reminder_sent_date=None,
        reopen_count=F("reopen_count") + 1,
        fulfillment_status=Negotiation.FULFILLMENT_NOT_APPLICABLE,
        fulfillment_note=None,
        fulfillment_at=None,
    )
    if not updated:
        return False
    negotiation.decided_at = None
    negotiation.abandoned_at = None
    negotiation.reminder_sent = False
    negotiation.reminder_sent_date = None
    negotiation.fulfillment_status = Negotiation.FULFILLMENT_NOT_APPLICABLE
    negotiation.fulfillment_note = None
    negotiation.fulfillment_at = None
    negotiation.reopen_count = (
        Negotiation.objects.filter(pk=negotiation.pk)
        .values_list("reopen_count", flat=True)
        .get()
    )
    return True


def _clock_snapshot(negotiation):
    return {
        field: getattr(negotiation, field)
        for field in CLOCK_SNAPSHOT_FIELDS
    }


def _replay_current_cycle(snapshot):
    return (
        snapshot["decided_at"] is None
        and snapshot["abandoned_at"] is None
        and (snapshot["reopen_count"] or 0) == 0
    )


def archives_for_clock_replay(negotiation, archives=None):
    """Chronological Archive rows; ``id`` breaks timestamp ties."""
    if archives is None:
        archives = negotiation.archives.order_by(*ARCHIVE_CLOCK_ORDER)
        return list(archives)
    return sorted(
        archives,
        key=lambda row: (row.archived_timestamp, row.id),
    )


def proposed_clocks_from_archives(negotiation, archives=None):
    """Replay history onto a copy of the live clocks.

    Write-once fields keep any value already set by live writers. Current-cycle
    fields (decided/abandoned/reopen/reminders) replay only when those live
    clocks are still empty, so a 4a-written row is not double-counted.
    """
    proposed = _clock_snapshot(negotiation)
    proposed["reopen_count"] = proposed["reopen_count"] or 0
    replay_cycle = _replay_current_cycle(proposed)

    for archive in archives_for_clock_replay(negotiation, archives):
        description = (archive.change_description or "").strip()
        if not description:
            continue
        at = archive.archived_timestamp
        if description == DESC_SUBMITTED and proposed["submitted_at"] is None:
            proposed["submitted_at"] = at
        if (
            description in FIRST_LOOK_DESCRIPTIONS
            and proposed["first_owner_open_at"] is None
        ):
            proposed["first_owner_open_at"] = at
        if not replay_cycle:
            continue
        if description in DECIDED_DESCRIPTIONS:
            proposed["decided_at"] = at
            proposed["abandoned_at"] = None
        if description in ABANDONED_DESCRIPTIONS:
            proposed["abandoned_at"] = at
        if is_reopen_description(description):
            proposed["decided_at"] = None
            proposed["abandoned_at"] = None
            proposed["reopen_count"] += 1
            proposed["reminder_sent"] = False
            proposed["reminder_sent_date"] = None

    return proposed


def clock_backfill_changes(start, proposed):
    return {
        field: proposed[field]
        for field in CLOCK_SNAPSHOT_FIELDS
        if start[field] != proposed[field]
    }


def empty_clock_backfill_stats():
    stats = {
        "negotiations": 0,
        "negotiations_changed": 0,
    }
    for field in (
        "submitted_at",
        "first_owner_open_at",
        "decided_at",
        "abandoned_at",
    ):
        stats[field] = {"updated": 0, "already_set": 0, "still_null": 0}
    stats["reopen_count"] = {
        "updated": 0,
        "already_set": 0,
        "unchanged_zero": 0,
    }
    return stats


def _record_clock_backfill_stats(stats, start, proposed, changes):
    stats["negotiations"] += 1
    if changes:
        stats["negotiations_changed"] += 1

    for field in (
        "submitted_at",
        "first_owner_open_at",
        "decided_at",
        "abandoned_at",
    ):
        if start[field] is not None:
            stats[field]["already_set"] += 1
        elif proposed[field] is not None:
            stats[field]["updated"] += 1
        else:
            stats[field]["still_null"] += 1

    start_count = start["reopen_count"] or 0
    proposed_count = proposed["reopen_count"] or 0
    if start_count > 0:
        stats["reopen_count"]["already_set"] += 1
    elif proposed_count > start_count:
        stats["reopen_count"]["updated"] += 1
    else:
        stats["reopen_count"]["unchanged_zero"] += 1


def load_archives_grouped_for_clocks():
    grouped = defaultdict(list)
    queryset = Archive.objects.order_by("negotiation_id", *ARCHIVE_CLOCK_ORDER)
    for archive in queryset.iterator(chunk_size=500):
        grouped[archive.negotiation_id].append(archive)
    return grouped


def apply_clock_backfill(negotiation, archives=None, *, write=False):
    start = _clock_snapshot(negotiation)
    start["reopen_count"] = start["reopen_count"] or 0
    proposed = proposed_clocks_from_archives(negotiation, archives)
    changes = clock_backfill_changes(start, proposed)
    if write and changes:
        with transaction.atomic():
            Negotiation.objects.filter(pk=negotiation.pk).update(**changes)
        for field, value in changes.items():
            setattr(negotiation, field, value)
    return start, proposed, changes


def backfill_negotiation_clocks(*, write=False):
    stats = empty_clock_backfill_stats()
    archives_by_negotiation = load_archives_grouped_for_clocks()
    for negotiation in Negotiation.objects.iterator(chunk_size=200):
        start, proposed, changes = apply_clock_backfill(
            negotiation,
            archives_by_negotiation.get(negotiation.pk, []),
            write=write,
        )
        _record_clock_backfill_stats(stats, start, proposed, changes)
    return stats

