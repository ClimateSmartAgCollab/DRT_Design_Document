from django.core.cache import cache
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from jinja2 import Environment, FileSystemLoader, select_autoescape, Template
from django.utils.translation import gettext_lazy as _
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


def generate_license_and_notify_owner(nlink):
    """Generate license and send email"""
    try:
        negotiation = nlink.negotiation
        submission = negotiation.requestor_responses

        # Flatten the nested form data structure
        details = flatten_form_data(submission)

        attachments = []

        owner_table = cache.get("owner_table")

        license_id = getattr(nlink, 'license_id', None)
        cache_key = f'license_template_{license_id}'
        license_template_content = cache.get(cache_key)

        # If not in cache, try to fetch but don't block
        if not license_template_content:
            try:
                from datastore.views import fetch_license_template
                license_template_content = fetch_license_template(license_id)
                # Cache it for future use
                if license_template_content:
                    cache.set(cache_key, license_template_content,
                              timeout=60*60*24)
            except Exception as e:
                logger.error(f"Error fetching license template: {str(e)}")
                license_template_content = None

        if license_template_content:
            # Create template from string content and render it
            template = Template(license_template_content)
            txt = template.render(submission=details, owner_table=owner_table)
        else:
            # Fallback to default template if GitHub fetch fails
            logger.warning(f"Using fallback template for license {license_id}")
            env = Environment(
                loader=FileSystemLoader("drt/templates"),
                autoescape=select_autoescape(['html', 'xml', 'json'])
            )
            tpl = env.get_template("license_template_fallback.jinja")
            txt = tpl.render(submission=details, owner_table=owner_table)

        attachments.append(("license.txt", txt, "text/plain"))

        owner_table = cache.get("owner_table", {})
        owner_email = owner_table.get(nlink.owner_id, {}).get("owner_email")
        if not owner_email:
            logger.error(f"Owner email not found for ID: {nlink.owner_id}")
            return

        # Send email directly
        subject = "License Agreement for Record – " + nlink.record_label
        body = (
            f"Hello,\n\n"
            f"We hope this message finds you well. Please find attached the license agreement documents related to the dataset for your review and negotiation.\n\n"
            f"Below are the key details regarding this license request:\n"
            f"  • Data Label: {nlink.data_label}\n"
            f"  • Tags: {nlink.tags}\n"
            f"  • Record Label: {nlink.record_label}\n"
            f"  • Requestor Email: {nlink.requestor_email}\n\n"
            f"You can access your Dashboard at: https://drt-test.canadacentral.cloudapp.azure.com/negotiation/owner/homepage\n\n"
            f"Please review the attached documents at your earliest convenience. If you have any questions or require clarification, do not hesitate to contact us at adc@uoguelph.ca.\n\n"
            f"Best regards,\n"
            f"DRT System"
        )

        html_content = f"""
            <p>Hello,</p>
            <p>We hope this message finds you well. Please find attached the license agreement documents related to the dataset for your review and negotiation.</p>
            <p>Below are the key details regarding this license request:</p>
            <ul>
                <li><strong>Data Label:</strong> {nlink.data_label}</li>
                <li><strong>Tags:</strong> {nlink.tags}</li>
                <li><strong>Record Label:</strong> {nlink.record_label}</li>
                <li><strong>Requestor Email:</strong> {nlink.requestor_email}</li>
            </ul>
            <p>You can access your <a href="https://drt-test.canadacentral.cloudapp.azure.com/negotiation/owner/homepage" target="_blank">Dashboard</a>.</p>
            <p>Please review the attached documents at your earliest convenience. If you have any questions or require clarification, do not hesitate to contact us at adc@uoguelph.ca.</p>
            <p>Best regards,<br>The DRT System</p>
        """

        email = EmailMultiAlternatives(
            subject=subject,
            body=body,
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
