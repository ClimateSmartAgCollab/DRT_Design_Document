
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
from django.core.mail import EmailMultiAlternatives
from ..services.license import generate_license_and_notify_owner

logger = logging.getLogger(__name__)

@csrf_exempt
@api_view(['GET'])
# todo: using cahce decorator ---> @cache_page(86400)
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
        # Log full traceback to console
        logger.error(traceback.format_exc())
        # Also return it in the response so front-end can display it
        return JsonResponse({'error': str(e)}, status=500)

    logger.info(f"Negotiation created with PK: {negotiation.pk}")
    print(f"Negotiation created with PK: {negotiation.pk}")

    # todo: use uuid7 that includes embedded timestamp data,to manage time-related functionality for link expiration.
    # Create NLink and associate it with the Negotiation
    owner_link_id, requestor_link_id = uuid.uuid4(), uuid.uuid4()
    print(f"Owner Link ID: {owner_link_id}")  # <-- debug
    print(f"Requestor Link ID: {requestor_link_id}")  # <-- debug

    nlink = NLink.objects.create(
        negotiation=negotiation,
        owner_id=example_link['owner_id'],  # Owner ID from cache
        license_id=example_link['license_id'],  # License ID from cache
        # dataset_ID=example_link['data_label'],  # Dataset ID from cache
        data_label=example_link['data_label'],  # Data label from cache
        tags=example_link['tags'],  # Tags from cache
        requestor_link=requestor_link_id,
        owner_link=owner_link_id,
        expiration_date=datetime.datetime.now() + datetime.timedelta(days=7)
    )

    print(f"Created NLink with ID: {nlink.requestor_link}")  # <-- debug
    # # Redirect the requestor to the email entry page
    # return redirect('requestor_email_entry', link_id=requestor_link_id)

    # Instead of redirecting, return the requestor_link_id as JSON
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

    print(f"Questionnaire Link: {questionnaire_url}")

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

            # msg = EmailMultiAlternatives(
            #     subject='Data Request Submission Confirmation',
            #     body=f'Your request has been submitted successfully.\n\n we will notify you once the owner has reviewed it.',
            #     from_email=settings.DEFAULT_FROM_EMAIL,
            #     to=[nlink.requestor_email],
            #     headers={'Reply-To': settings.DEFAULT_FROM_EMAIL},
            # )
            # msg.send(fail_silently=False)

            owner_table = cache.get("owner_table")
            if owner_table and nlink.owner_id in owner_table:
                # Generate the dynamic URL
                owner_email = owner_table[nlink.owner_id]["owner_email"]
                frontend_base_url = getattr(
                    'drt_core/settings/local.py', 'FRONTEND_BASE_URL', 'http://127.0.0.1:3000')
                # frontend_base_url = getattr('drt_core/settings/local.py', 'FRONTEND_BASE_URL', 'https://drt-design-document.onrender.com')
                owner_review_url = f"{frontend_base_url}/negotiation/owner/{nlink.owner_link}/owner-review"

                # msg = EmailMultiAlternatives(
                #     subject='New Data Request to Review',
                #     body=f'A new data request has been submitted. Please review it at {owner_review_url}',
                #     from_email=settings.DEFAULT_FROM_EMAIL,
                #     to=[owner_email],
                #     headers={'Reply-To': settings.DEFAULT_FROM_EMAIL},
                # )
                # msg.send(fail_silently=False)

                print(
                    f"Email sent to {owner_email} with link: {owner_review_url}")

            return JsonResponse({'message': 'Questionnaire submitted successfully!'})

        return JsonResponse({'error': 'Invalid action specified.'}, status=400)

    else:
        # For GET requests, retrieve questionnaire, saved answers, AND any owner feedback
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

    # Handle GET request and return JSON data
    if request.method == 'GET':
        bypass_completed = request.query_params.get('success') == 'true'

        if negotiation.state == 'requestor_open':
            return Response({'error': 'The questionnaire is requestor_open and cannot be edited by the owner.'}, status=403)

        if negotiation.state == 'completed' and not bypass_completed:
            return Response({'error': 'The negotiation is completed and cannot be edited.'}, status=403)

        # Return negotiation details as JSON
        return Response({
            'owner_responses': negotiation.owner_responses,
            'comments': negotiation.comments,
            'requestor_responses': negotiation.requestor_responses,
            'state': negotiation.state,
        })

    # Handle POST requests for different actions
    if request.method == 'POST':
        data = request.data  # Use `request.data` to access JSON body

        if 'save' in data:
            negotiation.owner_responses = data.get('owner_responses', '')
            # Debugging line
            print(f"Owner Responses: {negotiation.owner_responses}")
            negotiation.comments = data.get('comments', '')
            print(f"Comments: {negotiation.comments}")  # Debugging line
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

    # msg = EmailMultiAlternatives(
    #     subject='Clarification Required',
    #     body=f'Please provide additional information.\n\n Access your form in this link: {clarification_url}',
    #     from_email=settings.DEFAULT_FROM_EMAIL,
    #     to=[requestor_email],
    #     headers={'Reply-To': settings.DEFAULT_FROM_EMAIL},
    # )
    # msg.send(fail_silently=False)
