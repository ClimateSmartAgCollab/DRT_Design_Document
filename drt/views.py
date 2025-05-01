import os
from django.conf import settings
from django.shortcuts import render, redirect, get_object_or_404
from django.core.mail import send_mail
from django.core.mail import EmailMessage
from django.urls import NoReverseMatch, reverse
from django.http import HttpResponse, JsonResponse
from django.utils.crypto import get_random_string
from django.core.cache import cache
from django.core.validators import validate_email
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from django.views.decorators.csrf import csrf_exempt
from jinja2 import Environment, FileSystemLoader, select_autoescape
# from django.views.decorators.cache import cache_page
from django.utils import timezone
from django.db import transaction
from django.db.models.signals import post_save
from django.db.models import Avg, Count, F, Q
from django.utils.translation import gettext_lazy as _
from django.dispatch import receiver
from rest_framework.decorators import api_view
from rest_framework import status
from django.contrib.auth.decorators import login_required
from rest_framework.response import Response
from .models import Requestor, NLink, Negotiation, Archive, SummaryStatistic
import uuid
import datetime
import logging
import json


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
    example_link = next((data for url, data in link_table.items() if link_id in url), None)
    if example_link == None:
        logger.warning(f"Link ID {link_id} not found in cache.")
        return Response({'error': f'Link ID {link_id} not found'}, status=404)

    # Create a new Negotiation instance
    negotiation = Negotiation.objects.create(
        questionnaire_SAID=example_link['questionnaire_id'],
        state='requestor_open'
    )
    logger.info(f"Negotiation created with ID: {negotiation.negotiation_id}")

    # todo: use uuid7 that includes embedded timestamp data,to manage time-related functionality for link expiration.
    # Create NLink and associate it with the Negotiation
    owner_link_id, requestor_link_id = uuid.uuid4(), uuid.uuid4()

    nlink = NLink.objects.create(
        negotiation=negotiation,
        owner_id=example_link['owner_id'],  # Owner ID from cache
        license_id=example_link['license_id'],  # License ID from cache
        dataset_ID=example_link['data_label'],  # Dataset ID from cache
        requestor_link=requestor_link_id,
        owner_link=owner_link_id,
        expiration_date= datetime.datetime.now() + datetime.timedelta(days=7)
    )


    # # Redirect the requestor to the email entry page
    # return redirect('requestor_email_entry', link_id=requestor_link_id)

    # Instead of redirecting, return the requestor_link_id as JSON
    return JsonResponse({
        'requestor_link_id': str(requestor_link_id)
    })

@csrf_exempt
@api_view(['GET', 'POST'])
def requestor_email_entry(request, link_id):
    if request.method == 'POST':
        email = request.data.get('email') 

        # Validate the email format
        try:
            validate_email(email)
        except ValidationError:
            # Email format is invalid, respond with error message
            return Response({'error': 'Please enter a valid email address.'}, status=status.HTTP_400_BAD_REQUEST)

        # Generate a 6-digit OTP
        otp = get_random_string(6, '0123456789')

        # Store the requestor's email and OTP in the database
        requestor = Requestor.objects.create(
            requestor_email=email,
            otp=otp,
            otp_expiry=timezone.now() + datetime.timedelta(minutes=10), 
            is_verified=False
        )

        # Update the NLink object with the requestor's email
        try:
            nlink = NLink.objects.get(requestor_link=link_id)
            nlink.requestor_email = email
            nlink.save()
        except NLink.DoesNotExist:
            return Response({'error': 'Invalid link ID provided.'}, status=status.HTTP_400_BAD_REQUEST)

        # Simulate sending OTP (for now, just print it)
        print(f"OTP sent to {email}: {otp}")

        # Redirect URL for OTP verification
        otp_verification_url = reverse('verify_otp', kwargs={'link_id': link_id})
        return Response({'redirect_url': otp_verification_url})
    print(f"OTP sent to {email}: {otp}")
    return Response({'error': 'Invalid request method'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)


@csrf_exempt
@api_view(['GET', 'POST'])
def verify_otp(request, link_id):
    if request.method == 'POST':
        otp = request.data.get('otp')  # Use request.data for JSON

        # Retrieve the requestor details based on link ID
        try:
            nlink = NLink.objects.get(requestor_link=link_id)
            requestor = Requestor.objects.get(requestor_email=nlink.requestor_email)
        except (NLink.DoesNotExist, Requestor.DoesNotExist):
            return Response({'error': 'Invalid request. Link ID or email not found.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if OTP has expired
        if timezone.now() > requestor.otp_expiry:
            # OTP has expired, generate and send a new one
            new_otp = get_random_string(6, '0123456789')
            requestor.otp = new_otp
            requestor.otp_expiry = timezone.now() + datetime.timedelta(minutes=10)
            requestor.save()

            # Simulate sending new OTP (for now, just print it)
            print(f"New OTP sent to {requestor.requestor_email}: {new_otp}")

            return Response({'error': 'OTP expired. A new OTP has been sent to your email.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if the provided OTP is correct
        if requestor.otp == otp:
            requestor.is_verified = True
            requestor.otp_expiry = timezone.now()  # Clear OTP expiration
            requestor.save()

            # Redirect to the access request page with the link ID
            access_url = reverse('request_access', kwargs={'link_id': link_id})
            return Response({'redirect_url': access_url})
        else:
            # OTP is incorrect, prompt to re-enter a valid OTP
            return Response({'error': 'Invalid OTP. Please enter the correct OTP.'}, status=status.HTTP_400_BAD_REQUEST)

    return Response({'error': 'Invalid request method'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)


@api_view()
def request_access(request, link_id):
    """Send the requestor a direct link to access the questionnaire."""
    
    nlink = get_object_or_404(NLink, requestor_link=link_id)

    questionnaire_url = request.build_absolute_uri(
        reverse('fill_questionnaire', kwargs={'uuid': nlink.requestor_link})
    )

    print(f"Questionnaire Link: {questionnaire_url}")

    return Response({'status': 'Link sent successfully!', 'link': questionnaire_url})


@csrf_exempt
@api_view(['GET', 'POST'])
def fill_questionnaire(request, uuid):
    nlink = get_object_or_404(NLink, requestor_link=uuid)
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

            send_mail(
                'Your Data Request Submission Confirmation',
                f'Your request has been submitted successfully.\n\nSubmission Details:\n{negotiation.requestor_responses}',
                'noreply@dart-system.com',
                [nlink.requestor_email]
            )

            owner_table = cache.get("owner_table")
            if owner_table and nlink.owner_id in owner_table:
                # Generate the dynamic URL
                owner_email = owner_table[nlink.owner_id]["owner_email"]
                frontend_base_url = getattr('drt_core/settings/local.py', 'FRONTEND_BASE_URL', 'http://localhost:3000')  # Fallback to localhost if not set
                owner_review_url = f"{frontend_base_url}/negotiation/owner/{nlink.owner_link}/owner-review"


                send_mail(
                    'New Data Request to Review',
                    f'A new data request has been submitted. Please review it at {owner_review_url}',
                    'noreply@dart-system.com',
                    [owner_email]
                )

            return JsonResponse({'message': 'Questionnaire submitted successfully!'})

        return JsonResponse({'error': 'Invalid action specified.'}, status=400)

    else:
        # For GET requests, retrieve questionnaire, saved answers, AND any owner feedback
        sample_questionnaire = cache.get("OCA_package_schema_paper")
        saved_responses    = negotiation.requestor_responses or {}
        owner_blob        = negotiation.owner_responses or "{}"
        global_comments   = negotiation.comments        or ""

        return JsonResponse({
            'questionnaire':    sample_questionnaire,
            'saved_responses':   saved_responses,
            'owner_responses':   owner_blob,
            'comments':          global_comments,
        })





@api_view(['GET', 'POST'])
def owner_review(request, uuid):
    nlink = get_object_or_404(NLink, owner_link=uuid)
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
            negotiation.comments = data.get('comments', '')
            negotiation.save()
            return Response({'message': 'Review saved successfully!'})

        elif 'request_clarification' in data:
            # First save the comments, then flip back to requestor_open
            negotiation.owner_responses = data.get('owner_responses', '')
            negotiation.comments        = data.get('comments', '')
            negotiation.state           = 'requestor_open'
            negotiation.save()

            send_clarification_email(nlink.requestor_email, nlink.link_id)
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


# def generate_license_document(responses):
#     return f"License Document:\n{responses}"


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
        # Fallback or raise an error
        return


    subject = "Your License Agreement"
    body = (
        f"Hi,\n\n"
        f"Please review the attached license documents for your negotiation.\n"
        f"Requestor Email: {nlink.requestor_email}\n\n"
        f"Best,\nDART System"
    )
    email = EmailMessage(
        subject=subject,
        body=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[owner_email],
    )

    for filename, content, mimetype in attachments:
        email.attach(filename, content, mimetype)

    email.send()


def send_clarification_email(requestor_email, link_id):
    clarification_url = reverse('fill_questionnaire', kwargs={'uuid': link_id})
    send_mail(
        'Clarification Required',
        f'Please provide additional information: {clarification_url}',
        'noreply@dart-system.com',
        [requestor_email]
    )


# @api_view(['POST'])
# def cancel_request(request, link_id):
#     nlink = get_object_or_404(NLink, requestor_link=link_id)
#     negotiation = nlink.negotiation
#     negotiation.state = 'canceled'
#     negotiation.save()

#     send_mail(
#         'Request Canceled',
#         'The requestor has canceled the data request.',
#         'noreply@dart-system.com',
#         [nlink.owner_id]
#     )
#     return JsonResponse({'message': 'Request canceled successfully!'})




# Utility function to handle archiving and exporting statistics
def handle_negotiation_archive_and_summary(negotiation):
    """Archives the negotiation and exports summary statistics."""
    try:
        with transaction.atomic():
            export_summary_to_drt(negotiation)
            if not negotiation.archived:
                archive_negotiation(negotiation)
    except Exception as e:
        logger.error(f"Error processing negotiation {negotiation.negotiation_id}: {e}")
        return JsonResponse({'error': _('An error occurred while processing negotiation.')}, status=500)
    return JsonResponse({'message': _('Negotiation processed successfully')})


# Archive a negotiation
def archive_negotiation(negotiation):
    """Archive the negotiation and save relevant data."""
    Archive.objects.create(
        negotiation=negotiation,
        archived_data={
            'requestor_responses': negotiation.requestor_responses,
            'owner_responses': negotiation.owner_responses,
            'comments': negotiation.comments,
            'state': negotiation.state,
        }
    )
    negotiation.archived = True
    negotiation.save()

    try:
        archive_url = reverse('archive_negotiation', kwargs={'negotiation_id': negotiation.negotiation_id})
        return JsonResponse({'archive_url': archive_url})
    except NoReverseMatch as e:
        logger.error(f"Reverse URL error for negotiation {negotiation.negotiation_id}: {e}")
        return JsonResponse({'error': _('Invalid negotiation ID')}, status=400)

# Export summary statistics to DaRT system
def export_summary_to_drt(negotiation):
    """Collect and store anonymized, aggregated summary statistics."""
    try:
        # Fetch the related NLink object and extract the dataset_ID
        nlink = NLink.objects.get(negotiation=negotiation)
        datasets = [nlink.dataset_ID]  # Store dataset_ID in a list
        if not datasets:
            logger.warning(f"No dataset_ID found for negotiation {negotiation.negotiation_id}")

        # Aggregating key statistics across negotiations
        aggregated_stats = (
            Negotiation.objects
            .filter(state__in=['completed', 'canceled', 'rejected'])
            .aggregate(
                total_requests=Count('negotiation_id'),
                accepted_requests=Count('negotiation_id', filter=Q(state='completed')),
                rejected_requests=Count('negotiation_id', filter=Q(state='rejected')),
                average_response_time=Avg(F('timestamps') - F('timestamps'))
            )
        )

        # Collect anonymized requestor domains from NLink model
        requestor_domains = (
            NLink.objects
            .values(domain=F('requestor_email'))
            .annotate(request_count=Count('negotiation'))
        )

        # Convert datetime objects to strings for JSON serialization
        summary_data = {
            'owner_id': nlink,
            'datasets_requested': datasets,
            'overall_stat': {
                'total_requests': aggregated_stats['total_requests'],
                'accepted_requests': aggregated_stats['accepted_requests'],
                'rejected_requests': aggregated_stats['rejected_requests'],
                'average_response_time': str(aggregated_stats['average_response_time']),
                'requestor_domains': {
                    entry['domain']: entry['request_count'] for entry in requestor_domains
                },
                'generated_at': timezone.now().isoformat()  # Convert datetime to ISO 8601 string
            }
        }

        # Create a SummaryStatistics instance
        SummaryStatistic.objects.create(**summary_data)

        logger.info(f"Summary statistics exported for negotiation {negotiation.negotiation_id}")

    except NLink.DoesNotExist:
        logger.error(f"NLink not found for negotiation {negotiation.negotiation_id}")
    except Exception as e:
        logger.error(f"Failed to export summary statistics: {e}")

# Delete old negotiations
def delete_old_negotiations():
    """Delete negotiations older than 30 days."""
    cutoff_date = timezone.now() - datetime.timedelta(days=30)
    with transaction.atomic():
        negotiations = Negotiation.objects.filter(
            timestamps__lt=cutoff_date,
            state__in=['completed', 'canceled', 'rejected'],
            archived=True
        )
        count = negotiations.count()
        negotiations.delete()
    return JsonResponse({'message': _('Old negotiations deleted successfully'), 'deleted_count': count})

@receiver(post_save, sender=Negotiation)
def generate_summary_statistics(sender, instance, **kwargs):
    """Generate summary statistics and archive negotiation upon state change."""
    if instance.state in ['completed', 'canceled', 'rejected']:
        handle_negotiation_archive_and_summary(instance)

# Manually delete a negotiation's files and archive entry
def delete_negotiation_files(request, negotiation_id):
    """Delete a negotiation's files and corresponding archive."""
    negotiation = get_object_or_404(Negotiation, pk=negotiation_id)
    with transaction.atomic():
        archive = Archive.objects.filter(negotiation=negotiation).first()
        if archive:
            archive.delete()
        negotiation.delete()
    return JsonResponse({'message': _('Negotiation %(id)s deleted successfully') % {'id': negotiation_id}})


# Manually archive a negotiation
def archive_view(request, negotiation_id):
    """Manually archive a negotiation if it meets the required state."""
    negotiation = get_object_or_404(Negotiation, pk=negotiation_id)
    if negotiation.state in ['completed', 'canceled', 'rejected']:
        return handle_negotiation_archive_and_summary(negotiation)
    else:
        return JsonResponse(
            {'message': _('Only completed, canceled, or rejected negotiations can be archived')}, status=400
        )

# View to display a list of negotiations
def negotiation_list(request):
    """Display a list of all negotiations."""
    negotiations = Negotiation.objects.all()
    return render(request, 'list.html', {'negotiations': negotiations})

# Manually trigger deletion of old negotiations
def delete_old_negotiations_view(request):
    """Manually trigger the deletion of old negotiations."""
    return delete_old_negotiations()


@receiver(post_save, sender=Negotiation)
def generate_summary_statistics(sender, instance, **kwargs):
    """Auto-archive and export statistics when a negotiation is completed, canceled, or rejected."""
    if instance.state in ['completed', 'canceled', 'rejected'] and not instance.archived:
        handle_negotiation_archive_and_summary(instance)


@login_required
def summary_statistics_view(request, owner_id):
    """Endpoint for retrieving summary statistics based on the provided owner_id (string)."""
    try:
        # Retrieve summary statistics using the string `owner_id`
        summary_statistics = SummaryStatistic.objects.filter(owner_id__owner_id=owner_id)  # Adjust if owner_id is the field in NLink

        # If no statistics found, return an error
        if not summary_statistics.exists():
            return JsonResponse({'error': 'Owner statistics not found.'}, status=404)

        # Serialize the summary data
        statistics_data = [
            {
                'dataset_id': stat.datasets_requested,
                'total_requests': stat.overall_stat.get('total_requests', 0),
                'accepted_requests': stat.overall_stat.get('accepted_requests', 0),
                'rejected_requests': stat.overall_stat.get('rejected_requests', 0),
                'average_response_time': stat.overall_stat.get('average_response_time', 'N/A'),
                'generated_at': stat.summary_date.isoformat()
            }
            for stat in summary_statistics
        ]
        return JsonResponse({'summary_statistics': statistics_data})

    except ObjectDoesNotExist:
        return JsonResponse({'error': 'Owner statistics not found.'}, status=404)
    



# @csrf_exempt
# def submission_view(request):
#     if request.method == "POST":
#         try:
#             submission = json.loads(request.body)
            

#             env = Environment(
#                 loader=FileSystemLoader("drt/templates"),
#                 autoescape=select_autoescape(["html", "xml", "json"])
#             )
#             template = env.get_template("catalog_response.jinja")
            
            
#             # Render the JSON output using the Jinja template
#             rendered_json = template.render(submission=submission)
            
#             # Return the response as a downloadable JSON file
#             response = HttpResponse(rendered_json, content_type='application/json')
#             response['Content-Disposition'] = 'attachment; filename="standardized_openAIRE.json"'
#             return response
        
#         except Exception as e:
#             print("Error rendering template:", e)
#             return JsonResponse({"status": "error", "message": str(e)}, status=400)
#     else:
#         return JsonResponse({"error": "Only POST requests are allowed."}, status=405)


@csrf_exempt
def submission_view(request):
    if request.method != "POST":
        return JsonResponse({ "error": "Only POST requests are allowed." }, status=405)

    submission = json.loads(request.body)
    print("submission:" , submission)  # <<–– debug
    fmt = request.GET.get("format", "json").lower()
    print(f"🔍 submission_view: format param = '{fmt}'")   # <<–– debug

    env = Environment(
        loader=FileSystemLoader("drt/templates"),
        autoescape=select_autoescape(["html", "xml", "json"])
    )

    if fmt == "license":
        print("📄 rendering license_template.jinja")        
        template = env.get_template("license_template.jinja")
        content_type = "text/plain"
        filename = "license.txt"
        context = {"submission": submission}

    elif fmt == "odrl":
        print("📃 rendering license_odrl.xml.jinja")       
        template = env.get_template("license_odrl.xml.jinja")
        content_type = "application/xml"
        filename = "license.xml"
        context = {"submission": submission}

    else:
        print("🔧 rendering catalog_response.jinja")      
        template = env.get_template("catalog_response.jinja")
        content_type = "application/json"
        filename = "standardized_openAIRE.json"
        context = {"submission": submission}

    rendered = template.render(**context)
    response = HttpResponse(rendered, content_type=content_type)
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response
