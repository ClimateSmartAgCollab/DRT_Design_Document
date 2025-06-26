from django.core.cache import cache
from jinja2 import Environment, FileSystemLoader, select_autoescape
from django.utils.translation import gettext_lazy as _
from django.core.mail import EmailMultiAlternatives
from django.conf import settings

def generate_license_and_notify_owner(nlink):

    negotiation = nlink.negotiation
    submission = negotiation.requestor_responses

    for key in submission:
        if key not in ['save', 'submit']:
            details = submission[key]
            break  # assuming only one such key

    env = Environment(
        loader=FileSystemLoader("drt/templates"),
        autoescape=select_autoescape(['html', 'xml', 'json'])
    )

    attachments = []

    # Plain‐text license
    owner_table = cache.get("owner_table")
    tpl = env.get_template("license_template.jinja")
    txt = tpl.render(submission=details, owner_table=owner_table)
    attachments.append(("license.txt", txt, "text/plain"))

    # ODRL XML
    tpl = env.get_template("license_odrl.xml.jinja")
    xml = tpl.render(submission=details)
    attachments.append(("license.xml", xml, "application/xml"))

    # OpenAIRE JSON
    tpl = env.get_template("catalog_response.jinja")
    jsn = tpl.render(submission=details)
    attachments.append(("standardized_openAIRE.json", jsn, "application/json"))

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

