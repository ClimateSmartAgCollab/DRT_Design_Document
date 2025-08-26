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
from .utils import owner_auth_required, requestor_auth_required
from ..tasks import (
    send_notification_emails_task, 
    fetch_questionnaire_task, 
    generate_license_and_notify_owner_task,
    send_rejection_email_task,
    send_clarification_email_task
)

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
    # print(f"Negotiation created with PK: {negotiation.pk}")

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
        record_label=example_link['record_label'],
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

    # frontend_base_url = getattr('drt_core/settings/local.py', 'FRONTEND_BASE_URL', 'http://127.0.0.1:3000')
    frontend_base_url = getattr('drt_core/settings/local.py', 'FRONTEND_BASE_URL', 'https://drt-test.canadacentral.cloudapp.azure.com/')

    questionnaire_url = f"{frontend_base_url}/negotiation/{link_id}/fill-questionnaire"

    return Response({'status': 'Link sent successfully!', 'link': questionnaire_url})


@csrf_exempt
@api_view(['GET', 'POST'])
@requestor_auth_required
def fill_questionnaire(request, link_id):
    nlink = get_object_or_404(NLink, requestor_link=link_id)
    negotiation = nlink.negotiation

    # Handle questionnaire submission state checks
    if negotiation.state in ['owner_open', 'accepted', 'rejected']:
        state_messages = {
            'owner_open': 'The questionnaire is submitted and cannot be edited.',
            'accepted': 'The negotiation is accepted and cannot be edited.',
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
            # print(f"🔍 SAVING DATA: {json.dumps(data, indent=2)}")
            negotiation.requestor_responses = data
            negotiation.save()
            return JsonResponse({'message': 'Questionnaire saved successfully!'})

        elif data.get('submit'):
            # print(f"🔍 SUBMITTING DATA: {json.dumps(data, indent=2)}")
            negotiation.requestor_responses = data
            negotiation.state = 'owner_open'
            negotiation.save()

            # frontend_base_url = getattr('drt_core/settings/local.py', 'FRONTEND_BASE_URL', 'http://127.0.0.1:3000')
            frontend_base_url = getattr('drt_core/settings/local.py', 'FRONTEND_BASE_URL', 'https://drt-test.canadacentral.cloudapp.azure.com/')
            owner_review_url = f"{frontend_base_url}/negotiation/owner/{nlink.owner_link}/owner-review"

            # Use Celery to send notification emails asynchronously
            send_notification_emails_task.delay(nlink.link_id, owner_review_url)

            return JsonResponse({'message': 'Questionnaire submitted successfully!'})

        return JsonResponse({'error': 'Invalid action specified.'}, status=400)

    else:
        questionnaire_json = None
        
        cache_key = f'questionnaire_json_{negotiation.questionnaire_SAID}'
        cached_json = cache.get(cache_key)
        
        if cached_json:
            questionnaire_json = cached_json
        else:
            # Use Celery to fetch questionnaire asynchronously
            fetch_questionnaire_task.delay(negotiation.questionnaire_SAID)
            
            questionnaire_json = {"_loading": True, "message": "Questionnaire is being loaded..."}
        
        saved_responses = negotiation.requestor_responses or {}
        owner_blob = negotiation.owner_responses or "{}"
        global_comments = negotiation.comments or ""

        return JsonResponse({
            'questionnaire':    questionnaire_json,
            'saved_responses':   saved_responses,
            'owner_responses':   owner_blob,
            'comments':          global_comments,
        })

@api_view(['GET', 'POST'])
def owner_review(request, link_id):
    nlink = get_object_or_404(NLink, owner_link=link_id)
    negotiation = nlink.negotiation

    if request.method == 'GET':
        bypass_accepted = request.query_params.get('success') == 'true'

        if negotiation.state == 'requestor_open':
            return Response({'error': 'The questionnaire is requestor_open and cannot be edited by the owner.'}, status=403)

        if negotiation.state == 'accepted' and not bypass_accepted:
            return Response({'error': 'The negotiation is accepted and cannot be edited.'}, status=403)

        questionnaire_json = None
        
        cache_key = f'questionnaire_json_{negotiation.questionnaire_SAID}'
        cached_json = cache.get(cache_key)
        
        if cached_json:
            questionnaire_json = cached_json
        else:
            # Use Celery to fetch questionnaire asynchronously
            fetch_questionnaire_task.delay(negotiation.questionnaire_SAID)
            
            questionnaire_json = {"_loading": True, "message": "Questionnaire is being loaded..."}

        return Response({
            'questionnaire': questionnaire_json,
            'owner_responses': negotiation.owner_responses,
            'comments': negotiation.comments,
            'requestor_responses': negotiation.requestor_responses,
            'state': negotiation.state,
            'rationale': negotiation.rationale,
        })

    if request.method == 'POST':
        data = request.data

        if 'save' in data:
            # Save action doesn't require authentication
            negotiation.owner_responses = data.get('owner_responses', '')
            negotiation.comments = data.get('comments', '')
            negotiation.save()
            return Response({'message': 'Review saved successfully!'})

        # For restricted actions, check authentication
        restricted_actions = ['accept', 'reject', 'request_clarification', 'resend']
        action_found = None
        for action in restricted_actions:
            if action in data:
                action_found = action
                break
        
        if action_found:
            owner_email = request.session.get("owner_email")
            if not owner_email:
                return Response({'error': 'Owner authentication required for this action'}, status=401)
            
            if action_found == 'accept':
                negotiation.state = 'accepted'
                negotiation.save()
                
                generate_license_and_notify_owner_task.delay(nlink.link_id)
                
                return Response({'message': 'Request accepted, license generation started!'})

            elif action_found == 'reject':
                rationale = data.get('rationale', '')
                negotiation.rationale = rationale
                negotiation.state = 'rejected'
                negotiation.save()
                
                if rationale.strip():
                    send_rejection_email_task.delay(nlink.requestor_email, nlink.requestor_link, rationale)
                
                return Response({'message': 'Request rejected!'})

            elif action_found == 'request_clarification':
                negotiation.owner_responses = data.get('owner_responses', '')
                negotiation.comments = data.get('comments', '')
                negotiation.state = 'requestor_open'
                negotiation.save()

                send_clarification_email(nlink.requestor_email, nlink.requestor_link)
                
                return Response({'message': 'Clarification requested!'})

            elif action_found == 'resend':
                generate_license_and_notify_owner_task.delay(nlink.link_id)
                
                return Response({'message': 'Email resend started!'})


def send_clarification_email(requestor_email, link_id):

    # frontend_base_url = getattr('drt_core/settings/local.py', 'FRONTEND_BASE_URL', 'http://127.0.0.1:3000')
    frontend_base_url = getattr('drt_core/settings/local.py', 'FRONTEND_BASE_URL', 'https://drt-test.canadacentral.cloudapp.azure.com/')

    clarification_url = f"{frontend_base_url}/negotiation/{link_id}/fill-questionnaire"

    # Send email directly (no threading needed since called with threading from view)
    send_clarification_email_task.delay(requestor_email, clarification_url)


def send_rejection_email_with_rationale(requestor_email, requestor_link, rationale):
    # Send email directly (no threading needed since called with threading from view)
    send_rejection_email_task(requestor_email, requestor_link, rationale)