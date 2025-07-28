from django.core.cache import cache
from jinja2 import Environment, FileSystemLoader, select_autoescape, Template
from django.utils.translation import gettext_lazy as _
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
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

    negotiation = nlink.negotiation
    submission = negotiation.requestor_responses

    # # Debug logging
    # logger.info(f"Original submission data: {submission}")
    # print(f"Original submission data: {submission}")  # For debugging
    # logger.info(f"Submission type: {type(submission)}")
    # print(f"Submission type: {type(submission)}")  # For debugging

    # Flatten the nested form data structure
    details = flatten_form_data(submission)
    # print(f"Flattened details: {details}")  # For debugging
    
    # logger.info(f"Flattened details: {details}")

    attachments = []

    owner_table = cache.get("owner_table")
    
    license_id = getattr(nlink, 'license_id', None) or 'l-001-test'
    cache_key = f'license_template_{license_id}'
    license_template_content = cache.get(cache_key)
    
    if not license_template_content:
        from datastore.views import fetch_license_template
        license_template_content = fetch_license_template(license_id)
    
    if license_template_content:
        # Create template from string content and render it
        template = Template(license_template_content)
        txt = template.render(submission=details, owner_table=owner_table)
    else:
        # Fallback to default template if GitHub fetch fails
        env = Environment(
            loader=FileSystemLoader("drt/templates"),
            autoescape=select_autoescape(['html', 'xml', 'json'])
        )
        tpl = env.get_template("license_template_fallback.jinja")
        txt = tpl.render(submission=details, owner_table=owner_table)
    
    attachments.append(("license.txt", txt, "text/plain"))

    # # ODRL XML
    # tpl = env.get_template("license_odrl.xml.jinja")
    # xml = tpl.render(submission=details)
    # attachments.append(("license.xml", xml, "application/xml"))

    # # OpenAIRE JSON
    # tpl = env.get_template("catalog_response.jinja")
    # jsn = tpl.render(submission=details)
    # attachments.append(("standardized_openAIRE.json", jsn, "application/json"))

    owner_table = cache.get("owner_table", {})
    owner_email = owner_table.get(nlink.owner_id, {}).get("owner_email")
    if not owner_email:
        raise ValueError(f"Owner email not found for ID: {nlink.owner_id}")

    subject = "License Agreement"
    body = (
        f"Hello,\n\n"
        f"Please review the attached license documents for your negotiation.\n"
        f"Requestor Email: {nlink.requestor_email}\n\n"
        f"Best,\nDART System"
    )
    email = EmailMultiAlternatives(
        subject=subject,
        body=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[owner_email],
    )

    for filename, content, mimetype in attachments:
        email.attach(filename, content, mimetype)

    email.send()

