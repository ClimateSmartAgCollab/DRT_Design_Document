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
import threading
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from ..services.license import generate_license_and_notify_owner
from .utils import owner_auth_required, requestor_auth_required

logger = logging.getLogger(__name__)

def send_notification_emails_async(nlink, owner_review_url):
    """Send notification emails asynchronously to avoid blocking the response"""
    try:
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
        msg.send(fail_silently=True)  

        owner_table = cache.get("owner_table")
        if owner_table and nlink.owner_id in owner_table:
            owner_email = owner_table[nlink.owner_id]["owner_email"]
            
            msg = EmailMultiAlternatives(
                subject = "Action Required: New Data Request for Record – " + nlink.record_label,
                body = (
                    "Hello Dear Data Owner,\n\n"
                    "A new data request has been submitted and is currently awaiting your review.\n\n"
                    f"You may review the request at the following link:\n\n"
                    f"    {owner_review_url}\n\n"
                    "Below are the details of the request for your reference:\n"
                    f"  • Data Label: {nlink.data_label}\n"
                    f"  • Tags: {nlink.tags}\n"
                    f"  • Record Label: {nlink.record_label}\n"
                    f"  • Requestor Email: {nlink.requestor_email}\n\n"
                    "Please log in and provide your feedback at your earliest convenience.\n"
                    "If you have any questions or require assistance, feel free to contact our team at ssanavi@uoguelph.ca.\n\n"
                    "Thank you for your prompt attention.\n\n"
                    "Best regards,\n"
                    "The DRT System"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[owner_email],
                headers={'Reply-To': settings.DEFAULT_FROM_EMAIL},
            )
            html_content = f"""
                <p>Hello Dear Owner,</p>
                <p>A new data request has been submitted and is awaiting your review.</p>
                <p>You can review the request here:</p>
                <p><a href=\"{owner_review_url}\" target=\"_blank\">{owner_review_url}</a></p>
                <p>Please log in and provide your feedback at your earliest convenience.<br>
                If you have any questions, simply reach out to our support team at ssanavi@uoguelph.ca.</p>
                <p>Thank you for your prompt attention.</p>
                <p>Best regards,<br>The DRT System</p>
            """
            msg.attach_alternative(html_content, "text/html")
            msg.send(fail_silently=True)  
            
    except Exception as e:
        logger.error(f"Error sending notification emails: {str(e)}")


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
    frontend_base_url = getattr('drt_core/settings/local.py', 'FRONTEND_BASE_URL', 'http://drt-test.canadacentral.cloudapp.azure.com/')

    questionnaire_url = f"{frontend_base_url}/negotiation/{link_id}/fill-questionnaire"

    return Response({'status': 'Link sent successfully!', 'link': questionnaire_url})


@csrf_exempt
@api_view(['GET', 'POST'])
@requestor_auth_required
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
            frontend_base_url = getattr('drt_core/settings/local.py', 'FRONTEND_BASE_URL', 'http://drt-test.canadacentral.cloudapp.azure.com/')
            owner_review_url = f"{frontend_base_url}/negotiation/owner/{nlink.owner_link}/owner-review"

            email_thread = threading.Thread(
                target=send_notification_emails_async,
                args=(nlink, owner_review_url)
            )
            email_thread.daemon = True
            email_thread.start()

            return JsonResponse({'message': 'Questionnaire submitted successfully!'})

        return JsonResponse({'error': 'Invalid action specified.'}, status=400)

    else:
        questionnaire_json = None
        
        cache_key = f'questionnaire_json_{negotiation.questionnaire_SAID}'
        cached_json = cache.get(cache_key)
        
        if cached_json:
            questionnaire_json = cached_json
        else:
            def fetch_questionnaire_async():
                try:
                    from datastore.views import fetch_questionnaire_json
                    fetched_json = fetch_questionnaire_json(negotiation.questionnaire_SAID)
                    if fetched_json:
                        cache.set(cache_key, fetched_json, timeout=60*60*24)
                except Exception as e:
                    logger.error(f"Error fetching questionnaire asynchronously: {str(e)}")
            
            threading.Thread(target=fetch_questionnaire_async, daemon=True).start()
            
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

@owner_auth_required
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

        questionnaire_json = None
        
        cache_key = f'questionnaire_json_{negotiation.questionnaire_SAID}'
        cached_json = cache.get(cache_key)
        
        if cached_json:
            questionnaire_json = cached_json
        else:
            def fetch_questionnaire_async():
                try:
                    from datastore.views import fetch_questionnaire_json
                    fetched_json = fetch_questionnaire_json(negotiation.questionnaire_SAID)
                    if fetched_json:
                        cache.set(cache_key, fetched_json, timeout=60*60*24)
                except Exception as e:
                    logger.error(f"Error fetching questionnaire asynchronously: {str(e)}")
            
            threading.Thread(target=fetch_questionnaire_async, daemon=True).start()
            
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
            negotiation.owner_responses = data.get('owner_responses', '')
            negotiation.comments = data.get('comments', '')
            negotiation.save()
            return Response({'message': 'Review saved successfully!'})

        elif 'accept' in data:
            negotiation.state = 'completed'
            negotiation.save()
            
            threading.Thread(target=generate_license_and_notify_owner, args=(nlink,)).start()
            
            return Response({'message': 'Request accepted, license generation started!'})

        elif 'reject' in data:
            rationale = data.get('rationale', '')
            negotiation.rationale = rationale
            negotiation.state = 'rejected'
            negotiation.save()
            
            if rationale.strip():
                threading.Thread(target=send_rejection_email_with_rationale, args=(nlink.requestor_email, nlink.requestor_link, rationale)).start()
            
            return Response({'message': 'Request rejected!'})

        elif 'request_clarification' in data:
            negotiation.owner_responses = data.get('owner_responses', '')
            negotiation.comments = data.get('comments', '')
            negotiation.state = 'requestor_open'
            negotiation.save()

            threading.Thread(target=send_clarification_email, args=(nlink.requestor_email, nlink.requestor_link)).start()
            
            return Response({'message': 'Clarification requested!'})

        elif 'resend' in data:
            threading.Thread(target=generate_license_and_notify_owner, args=(nlink,)).start()
            
            return Response({'message': 'Email resend started!'})


def send_clarification_email(requestor_email, link_id):

    # frontend_base_url = getattr('drt_core/settings/local.py', 'FRONTEND_BASE_URL', 'http://127.0.0.1:3000')
    frontend_base_url = getattr('drt_core/settings/local.py', 'FRONTEND_BASE_URL', 'http://drt-test.canadacentral.cloudapp.azure.com/')

    clarification_url = f"{frontend_base_url}/negotiation/{link_id}/fill-questionnaire"

    # Send email directly (no threading needed since called with threading from view)
    send_clarification_email_async(requestor_email, clarification_url)


def send_rejection_email_with_rationale(requestor_email, requestor_link, rationale):
    # Send email directly (no threading needed since called with threading from view)
    send_rejection_email_async(requestor_email, requestor_link, rationale)


def send_clarification_email_async(requestor_email, clarification_url):
    """Send clarification email asynchronously"""
    try:
        msg = EmailMultiAlternatives(
            subject="Action Required: Additional Information Required",
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
        html_content = f"""
            <p>Hello Dear Requestor,</p>
            <p>We need a bit more information to proceed with your request. Please complete the necessary details by accessing your form at the link below:</p>
            <p><a href=\"{clarification_url}\" target=\"_blank\">{clarification_url}</a></p>
            <p>If you have any questions or need assistance, simply reach out to our support team at ssanavi@uoguelph.ca.</p>
            <p>Thank you for your prompt attention.</p>
            <p>Best regards,<br>The DRT System</p>
        """
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=True)
    except Exception as e:
        logger.error(f"Error sending clarification email: {str(e)}")

def send_rejection_email_async(requestor_email, requestor_link, rationale):
    """Send rejection email asynchronously"""
    try:
        msg = EmailMultiAlternatives(
            subject="Your Data Request Was Rejected",
            body=(
                "Hello Dear Requestor,\n\n"
                "We regret to inform you that your data request has been rejected by the owner.\n\n"
                f"Rationale provided by the owner:\n\n{rationale}\n\n"
                "If you have any questions or wish to revise your request, please contact our support team at ssanavi@uoguelph.ca.\n\n"
                "Best regards,\n"
                "The DRT System"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[requestor_email],
            headers={'Reply-To': settings.DEFAULT_FROM_EMAIL},
        )
        msg.send(fail_silently=True)
    except Exception as e:
        logger.error(f"Error sending rejection email: {str(e)}")
