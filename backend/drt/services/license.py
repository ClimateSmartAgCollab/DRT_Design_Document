from django.core.cache import cache
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from jinja2 import Environment, FileSystemLoader, select_autoescape, Template
from django.utils.translation import gettext_lazy as _
from drt.utils.email_helpers import get_license_email_html
from datastore.cache_keys import (
    KEY_OWNER_TABLE,
    TTL_24H,
    license_template_key,
)
import json
import logging

logger = logging.getLogger(__name__)


def flatten_form_data(submission_data):
    flattened = {}

    if not submission_data:
        return flattened

    for step_id, step_data in submission_data.items():
        if step_id in ['save', 'submit']:
            continue

        if isinstance(step_data, dict):
            # Handle regular step data
            for field_id, field_value in step_data.items():
                if field_id == 'childrenData':
                    # Handle children data
                    for child_step_id, children in field_value.items():
                        if isinstance(children, list):
                            # Convert children to a list of their data
                            children_data = []
                            for child in children:
                                if isinstance(child, dict) and 'data' in child:
                                    children_data.append(child['data'])
                            if children_data:
                                # Normalize field ID: replace dots with underscores
                                normalized_step_id = step_id.replace('.', '_')
                                flattened[normalized_step_id] = children_data
                else:
                    # Regular field - normalize field ID
                    normalized_field_id = field_id.replace('.', '_')
                    flattened[normalized_field_id] = field_value
        else:
            # Direct value - normalize step ID
            normalized_step_id = step_id.replace('.', '_')
            flattened[normalized_step_id] = step_data

    return flattened


def build_license_context(negotiation=None, nlink=None, submission_data=None):
    """Context for GitHub license templates (expects `dr`, `submission`, `owner_table`)."""
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

    # Expose the flattened answers at the top level so license templates can
    # use bare placeholders like {{ name }} / {{ affiliation }} directly, while
    # keeping `submission`/`dr`/`owner_table` available for richer templates.
    context = dict(details)
    context.update({"submission": details, "dr": dr, "owner_table": owner_table})
    return context


def extract_jinja_source(license_template_content):
    """Return the renderable Jinja source from a license template.

    Datastore license templates are JSON documents shaped like
    ``{"jinja": "...", "d": ..., "oca_package_d": ..., "type": ...}`` where only
    the ``jinja`` field is the renderable template. Accepts a JSON string, an
    already-parsed dict, or a plain Jinja string (returned as-is for backward
    compatibility).
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


def render_license(license_template_content, context):
    """Render a license attachment from a datastore license template.

    Uses the template's ``jinja`` field when available, otherwise falls back to
    the local default template.
    """
    jinja_source = extract_jinja_source(license_template_content)
    if jinja_source:
        return Template(jinja_source).render(**context)

    logger.warning("Using fallback license template")
    env = Environment(
        loader=FileSystemLoader("drt/templates"),
        autoescape=select_autoescape(['html', 'xml', 'json']),
    )
    return env.get_template("license_template_fallback.jinja").render(**context)


def generate_license_and_notify_owner(nlink):
    """Generate license and send email"""
    try:
        negotiation = nlink.negotiation
        context = build_license_context(negotiation=negotiation, nlink=nlink)

        attachments = []

        license_id = getattr(nlink, 'license_id', None)
        cache_key = license_template_key(license_id)
        license_template_content = cache.get(cache_key)

        # If not in cache, try to fetch but don't block
        if not license_template_content:
            try:
                from datastore.views import fetch_license_template
                license_template_content = fetch_license_template(license_id)
                # Cache it for future use
                if license_template_content:
                    cache.set(cache_key, license_template_content, timeout=TTL_24H)
            except Exception as e:
                logger.error(f"Error fetching license template: {str(e)}")
                license_template_content = None

        txt = render_license(license_template_content, context)

        license_filename = f"license_{negotiation.negotiation_id}.txt"
        attachments.append((license_filename, txt, "text/plain"))

        owner_table = cache.get(KEY_OWNER_TABLE, {})
        owner_email = owner_table.get(nlink.owner_id, {}).get("owner_email")
        if not owner_email:
            logger.error(f"Owner email not found for ID: {nlink.owner_id}")
            return

        # Send email with consistent template
        subject = "License Agreement for Record – " + nlink.record_label
        dashboard_url = f"{settings.FRONTEND_BASE_URL}/negotiation/owner/homepage"
        
        # Generate consistent HTML content
        html_content = get_license_email_html(
            record_label=nlink.record_label,
            data_label=nlink.data_label,
            tags=nlink.tags,
            requestor_email=nlink.requestor_email,
            dashboard_url=dashboard_url
        )
        
        # Generate plain text content
        plain_text_content = (
            f"Hello,\n\n"
            f"We hope this message finds you well. Please find attached the license agreement documents related to the dataset for your review and negotiation.\n\n"
            f"Below are the key details regarding this license request:\n"
            f"  • Data Label: {nlink.data_label}\n"
            f"  • Tags: {nlink.tags}\n"
            f"  • Record Label: {nlink.record_label}\n"
            f"  • Requestor Email: {nlink.requestor_email}\n\n"
            f"You can access your Dashboard at: {dashboard_url}\n\n"
            f"Please review the attached documents at your earliest convenience. If you have any questions or require clarification, do not hesitate to contact us at adc@uoguelph.ca.\n\n"
            f"Best regards,\n"
            f"The DRT System"
        )

        email = EmailMultiAlternatives(
            subject=subject,
            body=plain_text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[owner_email],
        )
        email.attach_alternative(html_content, "text/html")

        for filename, content, mimetype in attachments:
            email.attach(filename, content, mimetype)

        email.send(fail_silently=True)
        logger.info(f"License email sent successfully to {owner_email}")

    except Exception as e:
        logger.error(f"Error in license generation: {str(e)}")
