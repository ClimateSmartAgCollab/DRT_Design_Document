"""License generation for data-access negotiations.

Turns a stored questionnaire submission into a rendered license document,
persists that artifact on the negotiation, and emails it to both parties.
The main entry points are:

- ``flatten_form_data``     normalize stored submission JSON into a flat dict
- ``build_license_context`` assemble the Jinja render context
- ``render_license``        render a datastore template (with local fallback)
- ``generate_license_and_notify_owner`` issue + persist + email
"""

import hashlib
import json
import logging
import re
from typing import Any, Optional

from jinja2 import FileSystemLoader, select_autoescape
from jinja2.sandbox import SandboxedEnvironment

from django.conf import settings
from django.core.cache import cache
from django.core.mail import EmailMultiAlternatives
from django.utils import timezone

from datastore.cache_keys import KEY_OWNER_TABLE, TTL_24H, license_template_key
from drt.models import Negotiation
from drt.services.access import owner_email_for_nlink
from drt.services.history import create_archive_snapshot
from drt.utils.email_helpers import get_license_email_html

logger = logging.getLogger(__name__)

DESC_ISSUED_LICENSE_PREFIX = "Issued license v"

# Control flags the frontend stores alongside answers; not questionnaire fields.
_SUBMISSION_FLAGS = frozenset({"save", "submit"})

# OCA ids like "q10.5" are field ids, not "namespace.field" pairs, so they must
# not be aliased to their suffix ("5").
_QUESTION_ID = re.compile(r"^q\d+$", re.IGNORECASE)


def _normalize_key(key: str) -> str:
    """Replace dots so the key is a valid Jinja identifier."""
    return key.replace(".", "_")


def _register_field(target: dict, field_id: str, value: Any) -> None:
    """Store ``value`` under the normalized id and, for namespaced ids such as
    ``requestor.name``, also under the short id (``name``).

    License templates commonly use the short form while submissions store the
    full OCA attribute name. The short alias never overwrites an existing key.
    """
    target[_normalize_key(field_id)] = value

    if "." not in field_id:
        return

    namespace, short = field_id.rsplit(".", 1)
    if not namespace or not short or _QUESTION_ID.match(namespace):
        return

    short_key = _normalize_key(short)
    target.setdefault(short_key, value)


def _normalize_record(record: Any) -> Any:
    """Apply field normalization to a single child record's ``data`` dict."""
    if not isinstance(record, dict):
        return record

    normalized: dict = {}
    for field_id, value in record.items():
        _register_field(normalized, field_id, value)
    return normalized


def _extract_child_groups(children_by_step: dict) -> list:
    """Return ``[(child_step_id, [normalized_record, ...]), ...]`` for each
    non-empty child group."""
    groups = []
    for child_step_id, children in children_by_step.items():
        if not isinstance(children, list):
            continue
        records = [
            _normalize_record(child["data"])
            for child in children
            if isinstance(child, dict) and "data" in child
        ]
        if records:
            groups.append((child_step_id, records))
    return groups


def flatten_form_data(submission_data: Optional[dict]) -> dict:
    """Flatten nested questionnaire submission data into a single-level dict
    suitable for Jinja rendering."""
    flattened: dict = {}
    if not submission_data:
        return flattened

    for step_id, step_data in submission_data.items():
        if step_id in _SUBMISSION_FLAGS:
            continue

        if not isinstance(step_data, dict):
            flattened[_normalize_key(step_id)] = step_data
            continue

        for field_id, field_value in step_data.items():
            if field_id != "childrenData":
                _register_field(flattened, field_id, field_value)
                continue

            groups = _extract_child_groups(field_value)
            if len(groups) == 1:
                # Single child type: key by the parent reference field
                # so templates can iterate over it directly.
                flattened[_normalize_key(step_id)] = groups[0][1]
            else:
                # Multiple child types: key by each child step id to avoid
                # collisions under the shared parent.
                for child_step_id, records in groups:
                    flattened[_normalize_key(child_step_id)] = records

    return flattened


def build_license_context(negotiation=None, nlink=None, submission_data=None) -> dict:
    """Build the Jinja render context for a license template.
    """
    if submission_data is None and negotiation is not None:
        submission_data = negotiation.requestor_responses

    details = flatten_form_data(submission_data)
    owner_table = cache.get(KEY_OWNER_TABLE) or {}
    dr = dict(details)

    if nlink is not None:
        owner_info = owner_table.get(nlink.owner_id, {}) or {}
        dr.update({
            "data_label": nlink.data_label,
            "record_label": nlink.record_label,
            "visible_label": nlink.visible_label or nlink.record_label or nlink.data_label or "",
            "tags": nlink.tags or [],
            "requestor_email": nlink.requestor_email,
            "owner_id": nlink.owner_id,
            "owner_email": owner_info.get("owner_email"),
            "owner_username": owner_info.get("username"),
            "license_id": nlink.license_id,
            "link_id": str(nlink.link_id),
        })
        if nlink.requestor_email:
            dr.setdefault("email", nlink.requestor_email)

    if negotiation is not None:
        dr.update({
            "negotiation_id": str(negotiation.negotiation_id),
            "questionnaire_id": negotiation.questionnaire_SAID,
            "state": negotiation.state,
            "timestamps": negotiation.timestamps.isoformat() if negotiation.timestamps else None,
        })

    context = dict(details)
    context.update({"submission": details, "dr": dr})
    return context


def extract_jinja_source(license_template_content: Any) -> str:
    """Return the renderable Jinja source from a license template.

    Datastore license templates are JSON documents shaped like
    ``{"jinja": "...", "d": ..., "oca_package_d": ..., "type": ...}`` where only
    the ``jinja`` field is renderable. Accepts a JSON string, an already-parsed
    dict, or a plain Jinja string (returned as-is for backward compatibility).
    """
    if not license_template_content:
        return ""

    content = license_template_content
    if isinstance(content, str):
        try:
            content = json.loads(content)
        except ValueError:
            return content  # plain Jinja string, not a JSON document

    if isinstance(content, dict):
        return content.get("jinja", "")

    return ""


def render_license(license_template_content: Any, context: dict) -> str:
    """Render a license from a datastore template, falling back to the local
    default template when no Jinja source is available."""
    jinja_source = extract_jinja_source(license_template_content)
    if jinja_source:
        env = SandboxedEnvironment(
            autoescape=select_autoescape(["html", "xml", "json"]),
        )
        return env.from_string(jinja_source).render(**context)

    logger.warning("Using fallback license template")
    env = SandboxedEnvironment(
        loader=FileSystemLoader("drt/templates"),
        autoescape=select_autoescape(["html", "xml", "json"]),
    )
    return env.get_template("license_template_fallback.jinja").render(**context)


def _load_license_template(license_id: Optional[str]) -> Any:
    """Return the cached license template, fetching and caching it on a miss.

    Failures are logged and treated as a miss so the caller can fall back to the
    default template rather than blocking license generation.
    """
    cache_key = license_template_key(license_id)
    template = cache.get(cache_key)
    if template:
        return template

    try:
        from datastore.views import fetch_license_template

        template = fetch_license_template(license_id)
        if template:
            cache.set(cache_key, template, timeout=TTL_24H)
        return template
    except Exception:
        logger.exception("Error fetching license template for %s", license_id)
        return None


def issued_license_description(version: int) -> str:
    return f"{DESC_ISSUED_LICENSE_PREFIX}{version}"


def persist_issued_license(negotiation, nlink, license_text: str) -> int:
    """Store the rendered license on the current-cycle negotiation row."""
    version = (negotiation.issued_license_version or 0) + 1
    digest = hashlib.sha256(license_text.encode("utf-8")).hexdigest()
    at = timezone.now()
    said = getattr(nlink, "license_id", None) or ""
    Negotiation.objects.filter(pk=negotiation.pk).update(
        license_SAID=said,
        issued_license_text=license_text,
        issued_license_sha256=digest,
        issued_license_at=at,
        issued_license_version=version,
    )
    negotiation.license_SAID = said
    negotiation.issued_license_text = license_text
    negotiation.issued_license_sha256 = digest
    negotiation.issued_license_at = at
    negotiation.issued_license_version = version

    try:
        create_archive_snapshot(
            negotiation,
            changed_by=owner_email_for_nlink(nlink) or "owner",
            change_description=issued_license_description(version),
            state=negotiation.state,
        )
    except Exception:
        logger.exception("Failed to archive issued license")
    return version


def _send_license_email(nlink, recipient: str, dashboard_url: str, attachment: tuple) -> None:
    """Send the stored license agreement (HTML + plain text) to one recipient."""
    html_content = get_license_email_html(
        record_label=nlink.record_label,
        data_label=nlink.data_label,
        tags=nlink.tags,
        requestor_email=nlink.requestor_email,
        dashboard_url=dashboard_url,
    )
    plain_text_content = (
        "Hello,\n\n"
        "We hope this message finds you well. Please find attached the license agreement "
        "documents related to the dataset for your review and negotiation.\n\n"
        "Below are the key details regarding this license request:\n"
        f"  • Data Label: {nlink.data_label}\n"
        f"  • Tags: {nlink.tags}\n"
        f"  • Record Label: {nlink.record_label}\n"
        f"  • Requestor Email: {nlink.requestor_email}\n\n"
        f"You can access your Dashboard at: {dashboard_url}\n\n"
        "Please review the attached documents at your earliest convenience. If you have any "
        "questions or require clarification, do not hesitate to contact us at adc@uoguelph.ca.\n\n"
        "Best regards,\n"
        "The DRT System"
    )

    email = EmailMultiAlternatives(
        subject=f"License Agreement for Record – {nlink.record_label}",
        body=plain_text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[recipient],
    )
    email.attach_alternative(html_content, "text/html")
    email.attach(*attachment)
    email.send(fail_silently=False)


def email_issued_license(nlink) -> bool:
    """Email the stored issued license to owner and requestor. Returns False if none."""
    negotiation = nlink.negotiation
    license_text = negotiation.issued_license_text
    if not license_text:
        logger.error(
            "No issued license to email for negotiation %s",
            negotiation.negotiation_id,
        )
        return False

    attachment = (
        f"license_{negotiation.negotiation_id}.txt",
        license_text,
        "text/plain",
    )
    owner_email = owner_email_for_nlink(nlink)
    requestor_email = nlink.requestor_email
    recipients = []
    if owner_email:
        recipients.append((
            owner_email,
            f"{settings.FRONTEND_BASE_URL}/negotiation/owner/homepage",
        ))
    if requestor_email and requestor_email not in {email for email, _url in recipients}:
        recipients.append((
            requestor_email,
            f"{settings.FRONTEND_BASE_URL}/negotiation/homepage",
        ))
    if not recipients:
        logger.error("No license email recipients for owner_id %s", nlink.owner_id)
        return False

    for recipient, dashboard_url in recipients:
        _send_license_email(nlink, recipient, dashboard_url, attachment)
        logger.info("License email sent successfully to %s", recipient)
    return True


def generate_license_and_notify_owner(nlink) -> None:
    """Render once, persist the issued license, and email that stored body."""
    try:
        negotiation = nlink.negotiation
        context = build_license_context(negotiation=negotiation, nlink=nlink)
        template = _load_license_template(getattr(nlink, "license_id", None))
        license_text = render_license(template, context)
        persist_issued_license(negotiation, nlink, license_text)
        email_issued_license(nlink)
    except Exception:
        logger.exception("Error in license generation")
