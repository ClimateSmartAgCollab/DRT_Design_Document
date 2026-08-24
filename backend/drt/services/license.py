"""License generation for data-access negotiations.

Turns a stored questionnaire submission into a rendered license document and
emails it to the dataset owner. The main entry points are:

- ``flatten_form_data``     normalize stored submission JSON into a flat dict
- ``build_license_context`` assemble the Jinja render context
- ``render_license``        render a datastore template (with local fallback)
- ``generate_license_and_notify_owner`` end-to-end orchestration
"""

import json
import logging
import re
from typing import Any, Optional

from jinja2 import Environment, FileSystemLoader, Template, select_autoescape

from django.conf import settings
from django.core.cache import cache
from django.core.mail import EmailMultiAlternatives

from datastore.cache_keys import KEY_OWNER_TABLE, TTL_24H, license_template_key
from drt.utils.email_helpers import get_license_email_html

logger = logging.getLogger(__name__)

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

    if negotiation is not None:
        dr.update({
            "negotiation_id": str(negotiation.negotiation_id),
            "questionnaire_id": negotiation.questionnaire_SAID,
            "state": negotiation.state,
            "timestamps": negotiation.timestamps.isoformat() if negotiation.timestamps else None,
        })

    context = dict(details)
    context.update({"submission": details, "dr": dr, "owner_table": owner_table})
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
        return Template(jinja_source).render(**context)

    logger.warning("Using fallback license template")
    env = Environment(
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


def _send_owner_license_email(nlink, owner_email: str, attachment: tuple) -> None:
    """Send the license agreement email (HTML + plain text) to the owner."""
    dashboard_url = f"{settings.FRONTEND_BASE_URL}/negotiation/owner/homepage"
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
        to=[owner_email],
    )
    email.attach_alternative(html_content, "text/html")
    email.attach(*attachment)
    email.send(fail_silently=False)


def generate_license_and_notify_owner(nlink) -> None:
    """Render the license for a negotiation and email it to the dataset owner."""
    try:
        negotiation = nlink.negotiation
        context = build_license_context(negotiation=negotiation, nlink=nlink)

        template = _load_license_template(getattr(nlink, "license_id", None))
        license_text = render_license(template, context)

        owner_table = cache.get(KEY_OWNER_TABLE, {})
        owner_email = owner_table.get(nlink.owner_id, {}).get("owner_email")
        if not owner_email:
            logger.error("Owner email not found for ID: %s", nlink.owner_id)
            return

        attachment = (f"license_{negotiation.negotiation_id}.txt", license_text, "text/plain")
        _send_owner_license_email(nlink, owner_email, attachment)
        logger.info("License email sent successfully to %s", owner_email)

    except Exception:
        logger.exception("Error in license generation")
