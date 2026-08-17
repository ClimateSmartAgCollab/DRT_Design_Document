# drt\views\questionnaire.py

from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.core.cache import cache
from django.views.decorators.csrf import csrf_exempt
from django.utils.translation import gettext_lazy as _
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from ..models import NLink, Negotiation
import uuid
import datetime
import logging
import json
import traceback
from .utils import requestor_auth_required
from ..tasks import (
    send_notification_emails_task, 
    fetch_questionnaire_task, 
    generate_license_and_notify_owner_task,
    send_rejection_email_task,
    send_clarification_email_task
)
from drt.services.history import create_archive_snapshot
from datastore.cache_keys import (
    KEY_LINK_TABLE,
    KEY_QUESTIONNAIRE_TABLE,
    TTL_24H,
    questionnaire_inflight_key,
    questionnaire_json_key,
)

logger = logging.getLogger(__name__)

try:
    from datastore.views import fetch_questionnaire_json, warm_github_cache
except ImportError as e:
    logger.error(f"Failed to import datastore helpers: {e}")
    fetch_questionnaire_json = None
    warm_github_cache = None

@csrf_exempt
@api_view(['GET'])
def generate_nlinks(request, link_id):
    link_table = cache.get(KEY_LINK_TABLE)
    if not link_table:
        logger.warning("generate_nlinks: cache cold, warming synchronously")
        if warm_github_cache is not None:
            warm_github_cache()
        link_table = cache.get(KEY_LINK_TABLE)
    if not link_table:
        logger.error("generate_nlinks: cache still empty after warm-up")
        return Response(
            {'error': 'Service temporarily unavailable, please retry'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    example_link = link_table.get(link_id) or next(
        (data for url, data in link_table.items() if link_id in url), None)
    if example_link is None:
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
        visible_label=example_link.get('visible_label', '') or example_link.get('data_label', ''),
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
@api_view(['GET'])
def preview_questionnaire(_request):
    """
    Preview endpoint for questionnaires - no authentication required.
    Returns a demo questionnaire for preview purposes.
    """
    PREFERRED_QUESTIONNAIRE_ID = 'q-001-test'

    try:
        if fetch_questionnaire_json is None:
            logger.error("Preview: fetch_questionnaire_json function not available")
            return Response({
                'error': 'Questionnaire fetch function not available. Check datastore app configuration.',
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        questionnaire_table = cache.get(KEY_QUESTIONNAIRE_TABLE)
        if not questionnaire_table:
            logger.info("Preview: questionnaire_table cache is empty; attempting cache warm-up")

            if warm_github_cache is None:
                logger.error("Preview: warm_github_cache function not available")
                return Response({
                    'error': 'Questionnaire table not found in cache and automatic warm-up is unavailable.',
                    'hint': 'Verify CONTEXT_HUB_URL and CONTEXT_HUB_API_KEY (or GITHUB_API_URL if DATASTORE_BACKEND=github)',
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            result = warm_github_cache()
            if not result.get("ok"):
                logger.error("Preview: cache warm-up failed: %s", result.get("error"))
                return Response({
                    'error': 'Cache warm-up failed.',
                    'detail': result.get("error"),
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            questionnaire_table = cache.get(KEY_QUESTIONNAIRE_TABLE)
            if not questionnaire_table:
                logger.error("Preview: questionnaire_table still empty after warm-up")
                return Response({
                    'error': 'Questionnaire table not found in cache after automatic warm-up.',
                    'hint': 'Verify ContextHub datastore configuration (CONTEXT_HUB_URL, CONTEXT_HUB_API_KEY)',
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        available_questionnaire_ids = list(questionnaire_table.keys())
        if not available_questionnaire_ids:
            logger.error("Preview: questionnaire_table is empty")
            return Response({
                'error': 'No questionnaires available in questionnaire table.',
                'hint': 'Verify questionnaire_table.csv in the GitHub datastore repository',
            }, status=status.HTTP_404_NOT_FOUND)
        
        preferred_questionnaire_id = PREFERRED_QUESTIONNAIRE_ID
        preferred_filename = (
            preferred_questionnaire_id
            if preferred_questionnaire_id.endswith('.json')
            else f'{preferred_questionnaire_id}.json'
        )

        if preferred_questionnaire_id in questionnaire_table:
            questionnaire_id = preferred_questionnaire_id
        else:
            questionnaire_id = next(
                (
                    qid for qid, filename in questionnaire_table.items()
                    if filename == preferred_filename or filename == preferred_questionnaire_id
                ),
                None
            )

        if questionnaire_id is None:
            logger.warning(
                "Preview: preferred questionnaire '%s' not found; falling back to first available",
                preferred_questionnaire_id
            )

        questionnaire_json = None
        
        cache_key = questionnaire_json_key(questionnaire_id) if questionnaire_id else None
        cached_json = cache.get(cache_key) if cache_key else None
        if cached_json:
            questionnaire_json = cached_json
            logger.info(f"Preview: Using cached questionnaire {questionnaire_id}")
        else:
            questionnaire_ids_to_try = ([questionnaire_id] if questionnaire_id else []) + [
                qid for qid in available_questionnaire_ids if qid != questionnaire_id
            ]
            
            for qid in questionnaire_ids_to_try:
                logger.info(f"Preview: Fetching questionnaire {qid}")
                fetched_json = fetch_questionnaire_json(qid)
                
                if fetched_json and not fetched_json.get('_loading'):
                    questionnaire_id = qid
                    questionnaire_json = fetched_json
                    cache.set(questionnaire_json_key(qid), fetched_json, timeout=TTL_24H)
                    logger.info(f"Preview: Successfully fetched and cached questionnaire {qid}")
                    break
            
            if not questionnaire_json:
                logger.error(f"Preview: Failed to load any questionnaire. Tried {len(questionnaire_ids_to_try)} questionnaires.")
                return Response({
                    'error': f'Failed to load questionnaire from GitHub. Tried {len(questionnaire_ids_to_try)} available questionnaires.',
                    'preferred_questionnaire': PREFERRED_QUESTIONNAIRE_ID,
                    'available_questionnaires': available_questionnaire_ids,
                    'hint': 'Check that the questionnaire files exist in GitHub at source_library/questionnaires/ and the GITHUB_TOKEN is configured correctly'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'questionnaire': questionnaire_json,
            'saved_responses': {},
            'owner_responses': "{}",
            'comments': "",
            'is_preview': True,
        })
    except Exception as e:
        logger.error(f"Preview: Unexpected error in preview_questionnaire: {e}", exc_info=True)
        return Response({
            'error': f'Unexpected error: {str(e)}',
            'type': type(e).__name__
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
            # Update last_activity on NLink when requestor saves
            nlink.save(update_fields=['last_activity'])
            return JsonResponse({'message': 'Questionnaire saved successfully!'})

        elif data.get('submit'):
            # print(f"🔍 SUBMITTING DATA: {json.dumps(data, indent=2)}")
            old_state = negotiation.state
            negotiation.requestor_responses = data
            negotiation.state = 'owner_open'
            # Increment submission_version on each requestor submission
            try:
                negotiation.submission_version = (negotiation.submission_version or 0) + 1
            except Exception:
                negotiation.submission_version = 1
            negotiation.save()
            # Update last_activity on NLink when requestor submits
            nlink.save(update_fields=['last_activity'])
            
            # Archive the requestor submission
            try:
                create_archive_snapshot(
                    negotiation,
                    changed_by=nlink.requestor_email or "requestor",
                    change_description='Requestor submitted questionnaire responses',
                    requestor_responses=data,
                    state='owner_open'
                )
            except Exception as e:
                logger.error(f"Failed to archive requestor submission: {e}")

            # frontend_base_url = getattr('drt_core/settings/local.py', 'FRONTEND_BASE_URL', 'http://127.0.0.1:3000')
            frontend_base_url = getattr('drt_core/settings/local.py', 'FRONTEND_BASE_URL', 'https://drt-test.canadacentral.cloudapp.azure.com/')
            owner_review_url = f"{frontend_base_url}/negotiation/owner/{nlink.owner_link}/owner-review"

            # Use Celery to send notification emails asynchronously
            send_notification_emails_task.delay(nlink.link_id, owner_review_url)

            return JsonResponse({'message': 'Questionnaire submitted successfully!'})

        return JsonResponse({'error': 'Invalid action specified.'}, status=400)

    else:
        questionnaire_json = None
        
        cached_json = cache.get(questionnaire_json_key(negotiation.questionnaire_SAID))
        
        if cached_json:
            questionnaire_json = cached_json
        else:
            # Use Celery to fetch questionnaire asynchronously
            inflight_key = questionnaire_inflight_key(negotiation.questionnaire_SAID)
            lock_ttl_seconds = 30
            if cache.add(inflight_key, 1, timeout=lock_ttl_seconds):
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
        
        cached_json = cache.get(questionnaire_json_key(negotiation.questionnaire_SAID))
        
        if cached_json:
            questionnaire_json = cached_json
        else:
            # Use the same anti-stampede lock as fill_questionnaire so concurrent
            # owner GETs do not enqueue duplicate fetch tasks for the same questionnaire.
            inflight_key = questionnaire_inflight_key(negotiation.questionnaire_SAID)
            lock_ttl_seconds = 30
            if cache.add(inflight_key, 1, timeout=lock_ttl_seconds):
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
            # Update last_activity on NLink when owner saves
            nlink.save(update_fields=['last_activity'])
            
            # Create archive entry for save action
            try:
                create_archive_snapshot(
                    negotiation,
                    changed_by="owner",
                    change_description="Owner saved review",
                    owner_responses=negotiation.owner_responses,
                    comments=negotiation.comments,
                    state=negotiation.state,
                )
            except Exception as e:
                logger.error(f"Failed to archive save action: {e}")
            
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
                # Update owner responses and comments before changing state
                negotiation.owner_responses = data.get('owner_responses', '')
                negotiation.comments = data.get('comments', '')
                negotiation.state = 'accepted'
                negotiation.save()
                # Update last_activity on NLink when owner accepts
                nlink.save(update_fields=['last_activity'])
                try:
                    create_archive_snapshot(
                        negotiation,
                        changed_by=owner_email or "owner",
                        change_description="Owner accepted",
                        owner_responses=negotiation.owner_responses,
                        comments=negotiation.comments,
                        state='accepted',
                    )
                except Exception as e:
                    logger.error(f"Failed to archive accept action: {e}")
                
                generate_license_and_notify_owner_task.delay(nlink.link_id)
                
                return Response({'message': 'Request accepted, license generation started!'})

            elif action_found == 'reject':
                rationale = data.get('rationale', '')
                # Update owner responses and comments before changing state
                negotiation.owner_responses = data.get('owner_responses', '')
                negotiation.comments = data.get('comments', '')
                negotiation.rationale = rationale
                negotiation.state = 'rejected'
                negotiation.save()
                # Update last_activity on NLink when owner rejects
                nlink.save(update_fields=['last_activity'])
                try:
                    create_archive_snapshot(
                        negotiation,
                        changed_by=owner_email or "owner",
                        change_description="Owner rejected",
                        owner_responses=negotiation.owner_responses,
                        comments=negotiation.comments,
                        state='rejected',
                    )
                except Exception as e:
                    logger.error(f"Failed to archive reject action: {e}")
                
                if rationale.strip():
                    send_rejection_email_task.delay(nlink.requestor_email, nlink.requestor_link, rationale)
                
                return Response({'message': 'Request rejected!'})

            elif action_found == 'request_clarification':
                old_state = negotiation.state
                negotiation.owner_responses = data.get('owner_responses', '')
                negotiation.comments = data.get('comments', '')
                negotiation.state = 'requestor_open'
                negotiation.save()
                # Update last_activity on NLink when owner requests clarification
                nlink.save(update_fields=['last_activity'])
                try:
                    create_archive_snapshot(
                        negotiation,
                        changed_by=owner_email or "owner",
                        change_description="Owner requested clarification",
                        owner_responses=negotiation.owner_responses,
                        comments=negotiation.comments,
                        state='requestor_open',
                    )
                except Exception as e:
                    logger.error(f"Failed to archive clarification action: {e}")

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