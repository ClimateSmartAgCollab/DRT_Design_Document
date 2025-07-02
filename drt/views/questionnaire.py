# drt\views\questionnaire.py

from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.core.cache import cache
from django.views.decorators.csrf import csrf_exempt
from django.utils.translation import gettext_lazy as _
from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import NLink, Negotiation
import uuid
import datetime
import logging
import json
import traceback
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from ..services.license import generate_license_and_notify_owner

logger = logging.getLogger(__name__)


@csrf_exempt
@api_view(['GET'])
def generate_nlinks(request, link_id):
    link_table = cache.get('link_table')
    if not link_table:
        logger.error("Link table not found in cache.")
        return Response({'error': 'Link table not found in cache'}, status=404)

    # Find the appropriate link data
    example_link = next(
        (data for url, data in link_table.items() if link_id in url), None)
    if example_link == None:
        logger.warning(f"Link ID {link_id} not found in cache.")
        return Response({'error': f'Link ID {link_id} not found'}, status=404)

    try:
        negotiation = Negotiation.objects.create(
            questionnaire_SAID=example_link['questionnaire_id'],
            state='requestor_open'
        )
    except Exception as e:
        logger.error(traceback.format_exc())
        return JsonResponse({'error': str(e)}, status=500)

    logger.info(f"Negotiation created with PK: {negotiation.pk}")
    print(f"Negotiation created with PK: {negotiation.pk}")

    # todo: use uuid7 that includes embedded timestamp data,to manage time-related functionality for link expiration.
    # Create NLink and associate it with the Negotiation
    owner_link_id, requestor_link_id = uuid.uuid4(), uuid.uuid4()

    nlink = NLink.objects.create(
        negotiation=negotiation,
        owner_id=example_link['owner_id'],  
        license_id=example_link['license_id'],  
        # dataset_ID=example_link['data_label'],  
        data_label=example_link['data_label'],  
        tags=example_link['tags'],  
        requestor_link=requestor_link_id,
        owner_link=owner_link_id,
        expiration_date=datetime.datetime.now() + datetime.timedelta(days=7)
    )

    return JsonResponse({
        'requestor_link_id': str(requestor_link_id)
    })


@api_view()
def request_access(request, link_id):
    """Send the requestor a direct link to access the questionnaire."""

    frontend_base_url = getattr(
        'drt_core/settings/local.py', 'FRONTEND_BASE_URL', 'http://127.0.0.1:3000')
    # frontend_base_url = getattr('drt_core/settings/local.py', 'FRONTEND_BASE_URL', 'https://drt-design-document.onrender.com')

    questionnaire_url = f"{frontend_base_url}/negotiation/{link_id}/fill-questionnaire"


    return Response({'status': 'Link sent successfully!', 'link': questionnaire_url})


@csrf_exempt
@api_view(['GET', 'POST'])
def fill_questionnaire(request, link_id):
    nlink = get_object_or_404(NLink, requestor_link=link_id)
    negotiation = nlink.negotiation

    # Handle questionnaire submission state checks
    if negotiation.state in ['owner_open', 'completed', 'rejected']:
        state_messages = {
            'owner_open': 'The questionnaire is submitted and cannot be edited.',
            'completed': 'The negotiation is completed and cannot be edited.',
            'rejected': 'The negotiation is rejected and cannot be edited.'
        }
        return JsonResponse({'error': state_messages[negotiation.state]}, status=400)

    if request.method == 'POST':
        # Parse JSON data from the request body
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON data provided.'}, status=400)

        if data.get('save'):
            negotiation.requestor_responses = data
            negotiation.save()
            return JsonResponse({'message': 'Questionnaire saved successfully!'})

        elif data.get('submit'):
            negotiation.requestor_responses = data
            negotiation.state = 'owner_open'
            negotiation.save()

            msg = EmailMultiAlternatives(
                subject="Your Data Request Has Been Received",
                body=(
                    "Hello Dear Requestor,\n\n"
                    "Thank you for submitting your data request. We have received it successfully and will notify you as soon as the owner has reviewed it.\n\n"
                    "If you have any questions in the meantime, please reach out to our support team at ssanavi@uoguelph.ca.\n\n"
                    "Best regards,\n"
                    "The DRT System"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[nlink.requestor_email],
                headers={'Reply-To': settings.DEFAULT_FROM_EMAIL},
            )
            msg.send(fail_silently=False)

            owner_table = cache.get("owner_table")
            if owner_table and nlink.owner_id in owner_table:
                # Generate the dynamic URL
                owner_email = owner_table[nlink.owner_id]["owner_email"]
                frontend_base_url = getattr(
                    'drt_core/settings/local.py', 'FRONTEND_BASE_URL', 'http://127.0.0.1:3000')
                # frontend_base_url = getattr('drt_core/settings/local.py', 'FRONTEND_BASE_URL', 'https://drt-design-document.onrender.com')
                owner_review_url = f"{frontend_base_url}/negotiation/owner/{nlink.owner_link}/owner-review"

                msg = EmailMultiAlternatives(
                    subject="Owner Action Required: New Data Request Submitted",
                    body=(
                        "Hello Dear Owner,\n\n"
                        "A new data request has been submitted and is awaiting your review.\n\n"
                        f"You can review the request here:\n\n"
                        f"    {owner_review_url}\n\n"
                        "Please log in and provide your feedback at your earliest convenience. "
                        "If you have any questions, simply reach out to our support team at ssanavi@uoguelph.ca.\n\n"
                        "Thank you for your prompt attention.\n\n"
                        "Best regards,\n"
                        "The DRT System"
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[owner_email],
                    headers={'Reply-To': settings.DEFAULT_FROM_EMAIL},
                )
                msg.send(fail_silently=False)


            return JsonResponse({'message': 'Questionnaire submitted successfully!'})

        return JsonResponse({'error': 'Invalid action specified.'}, status=400)

    else:
        sample_questionnaire = cache.get("OCA_package_schema_paper")
        saved_responses = negotiation.requestor_responses or {}
        owner_blob = negotiation.owner_responses or "{}"
        global_comments = negotiation.comments or ""

        return JsonResponse({
            'questionnaire':    sample_questionnaire,
            'saved_responses':   saved_responses,
            'owner_responses':   owner_blob,
            'comments':          global_comments,
        })


@api_view(['GET', 'POST'])
def owner_review(request, link_id):
    nlink = get_object_or_404(NLink, owner_link=link_id)
    negotiation = nlink.negotiation

    if request.method == 'GET':
        bypass_completed = request.query_params.get('success') == 'true'

        if negotiation.state == 'requestor_open':
            return Response({'error': 'The questionnaire is requestor_open and cannot be edited by the owner.'}, status=403)

        if negotiation.state == 'completed' and not bypass_completed:
            return Response({'error': 'The negotiation is completed and cannot be edited.'}, status=403)

        return Response({
            'owner_responses': negotiation.owner_responses,
            'comments': negotiation.comments,
            'requestor_responses': negotiation.requestor_responses,
            'state': negotiation.state,
        })

    if request.method == 'POST':
        data = request.data  

        if 'save' in data:
            negotiation.owner_responses = data.get('owner_responses', '')
            negotiation.comments = data.get('comments', '')
            negotiation.save()
            return Response({'message': 'Review saved successfully!'})

        elif 'request_clarification' in data:
            # First save the comments, then flip back to requestor_open
            negotiation.owner_responses = data.get('owner_responses', '')
            negotiation.comments = data.get('comments', '')
            negotiation.state = 'requestor_open'
            negotiation.save()

            send_clarification_email(
                nlink.requestor_email, nlink.requestor_link)
            return Response({'message': 'Clarification requested!'})

        elif 'accept' in data:
            negotiation.state = 'completed'
            negotiation.save()
            generate_license_and_notify_owner(nlink)
            return Response({'message': 'Request accepted, license generated!'})

        elif 'reject' in data:
            negotiation.state = 'rejected'
            negotiation.save()
            return Response({'message': 'Request rejected!'})

        elif 'resend' in data:
            # simply re-send the attachments
            generate_license_and_notify_owner(nlink)
            return Response({'message': 'Email resent successfully!'})

        return Response({'error': 'Invalid action.'}, status=400)


def send_clarification_email(requestor_email, link_id):

    frontend_base_url = getattr(
        'drt_core/settings/local.py', 'FRONTEND_BASE_URL', 'http://127.0.0.1:3000')
    # frontend_base_url = getattr('drt_core/settings/local.py', 'FRONTEND_BASE_URL', 'https://drt-design-document.onrender.com')

    clarification_url = f"{frontend_base_url}/negotiation/{link_id}/fill-questionnaire"

    msg = EmailMultiAlternatives(
        subject="Requestor Action Needed: Additional Information Required",
        body=(
            "Hello Dear Requestor,\n\n"
            "We need a bit more information to proceed with your request. "
            "Please complete the necessary details by accessing your form at the link below:\n\n"
            f"    {clarification_url}\n\n"
            "If you have any questions or need assistance, simply reach out to our support team at ssanavi@uoguelph.ca.\n\n"
            "Thank you for your prompt attention.\n\n"
            "Best regards,\n"
            "The DRT System"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[requestor_email],
        headers={'Reply-To': settings.DEFAULT_FROM_EMAIL},
    )
    msg.send(fail_silently=False)
