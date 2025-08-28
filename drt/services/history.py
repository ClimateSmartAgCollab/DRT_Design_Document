from typing import Dict, Any, Optional, List
from django.db import transaction
from django.utils.timezone import now
from ..models import Negotiation, Archive


def create_archive_snapshot(
    negotiation: Negotiation,
    *,
    changed_by: str = "",
    change_description: str = "",
    requestor_responses: Optional[Dict[str, Any]] = None,
    owner_responses: Optional[Dict[str, Any]] = None,
    comments: Optional[str] = None,
    state: Optional[str] = None,
) -> Archive:
    """
    Append a new Archive row capturing the current change.
    """
    with transaction.atomic():
        snapshot = Archive.objects.create(
            negotiation=negotiation,
            archived_data={
                "negotiation_id": str(negotiation.negotiation_id),
                "conversation_id": str(negotiation.conversation_id),
                "requestor_responses": requestor_responses if requestor_responses is not None else negotiation.requestor_responses,
                "owner_responses": owner_responses if owner_responses is not None else negotiation.owner_responses,
                "comments": comments if comments is not None else negotiation.comments,
                "state": state if state is not None else negotiation.state,
                "questionnaire_SAID": negotiation.questionnaire_SAID,
                "ts": now().isoformat(),
            },
            requestor_responses=requestor_responses,
            owner_responses=owner_responses,
            comments=comments,
            state=state,
            changed_by=changed_by or "",
            change_description=change_description or "",
            questionnaire_SAID=negotiation.questionnaire_SAID,
        )
        return snapshot


def get_archive_history(negotiation: Negotiation) -> List[Archive]:
    return list(negotiation.archives.all().order_by("archived_timestamp"))


def map_archives_to_versions(archives: List[Archive]) -> List[Dict[str, Any]]:
    versions: List[Dict[str, Any]] = []
    for idx, a in enumerate(archives, start=1):
        versions.append({
            "version_number": idx,
            "version_type": infer_version_type(a),
            "timestamp": a.archived_timestamp.isoformat(),
            "changed_by": a.changed_by or "",
            "change_description": a.change_description or "",
            "state": a.state or "",
            "requestor_responses": a.requestor_responses,
            "owner_responses": a.owner_responses,
            "comments": a.comments,
        })
    return versions


def infer_version_type(a: Archive) -> str:
    if a.requestor_responses is not None and a.state == "owner_open":
        return "requestor_submission"
    if a.state in {"accepted", "rejected"}:
        return "state_change"
    if a.owner_responses or (a.comments and a.comments.strip()):
        return "owner_response"
    return "state_change"  # default
