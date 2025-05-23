import os
from django.conf import settings
from django.shortcuts import render, get_object_or_404
from django.urls import NoReverseMatch, reverse
from django.http import HttpResponse, JsonResponse
from django.utils.crypto import get_random_string
from django.core.cache import cache
from django.core.validators import validate_email
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from jinja2 import Environment, FileSystemLoader, select_autoescape
# from django.views.decorators.cache import cache_page
from django.utils import timezone
from django.db import transaction
from django.db.models.signals import post_save
from django.db.models import Avg, F, Count, Q, Min, Max
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
import traceback
from django.core.mail import EmailMultiAlternatives


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
        dataset_ID=example_link['data_label'],  # Dataset ID from cache
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


@csrf_exempt
@api_view(['POST'])
def owner_email_entry(request):
    email = request.data.get('email')
    try:
        validate_email(email)
    except ValidationError:
        return Response({'error': 'Invalid email'}, status=400)

    # generate OTP
    otp = "9832"  # for testing
    # uncomment the next line for production
    # otp = get_random_string(6, '0123456789')

    expiry = timezone.now() + datetime.timedelta(minutes=10)
    # store in cache under "owner_auth:{email}"
    cache.set(f"owner_auth:{email}", {'otp': otp, 'expiry': expiry}, 600)

    # # send it
    # EmailMultiAlternatives(
    #   subject="Your Owner OTP",
    #   body=f"Your OTP is {otp}. Expires at {expiry:%H:%M}.",
    #   from_email=settings.DEFAULT_FROM_EMAIL,
    #   to=[email],
    # ).send(fail_silently=False)

    return Response({'message': 'OTP sent'}, status=200)


@csrf_exempt
@api_view(['POST'])
def req_email_entry(request):
    email = request.data.get('email')
    try:
        validate_email(email)
    except ValidationError:
        return Response({'error': 'Invalid email'}, status=400)

    # generate OTP
    otp = "9832"  # for testing
    # uncomment the next line for production
    # otp = get_random_string(6, '0123456789')

    expiry = timezone.now() + datetime.timedelta(minutes=10)
    # store in cache under "req_auth:{email}"
    cache.set(f"req_auth:{email}", {'otp': otp, 'expiry': expiry}, 600)
    print(f"OTP for {email}: {otp}")  # <-- debug
    print(f"Your OTP is {otp}. Expires at {expiry:%H:%M}.")  # <-- debug

    # # send it
    # EmailMultiAlternatives(
    #   subject="Your Req OTP",
    #   body=f"Your OTP is {otp}. Expires at {expiry:%H:%M}.",
    #   from_email=settings.DEFAULT_FROM_EMAIL,
    #   to=[email],
    # ).send(fail_silently=False)

    return Response({'message': 'OTP sent'}, status=200)


@api_view(['GET', 'POST'])
@ensure_csrf_cookie      # on a GET it will set csrftoken
@csrf_exempt             # only if you reorder so this still applies
def requestor_email_entry(request, link_id):
    try:
        # grab & validate
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)
        validate_email(email)

        # generate + store OTP
        otp = "9832"  # for testing
        # uncomment the next line for production
        # otp = get_random_string(6, '0123456789')

        expiry = timezone.now() + datetime.timedelta(minutes=10)
        # find or make the Requestor, then reset its OTP & expiry
        requestor, created = Requestor.objects.update_or_create(
            requestor_email=email,
            defaults={
                'otp': otp,
                'otp_expiry': expiry,
                'is_verified': False,
            }
        )
        nlink = get_object_or_404(NLink, requestor_link=link_id)
        nlink.requestor_email = email
        nlink.save(update_fields=['requestor_email'])

        # build and send the email
        subject = "DART System One-Time Password"
        text_content = (
            f"Hello,\n\n"
            f"Your one-time password (OTP) is:\n\n    {otp}\n\n"
            f"It expires at {expiry:%Y-%m-%d %H:%M:%S}.\n\n"
            f"— DART System Team"
        )
        # msg = EmailMultiAlternatives(
        #     subject=subject,
        #     body=text_content,
        #     from_email=settings.DEFAULT_FROM_EMAIL,
        #     to=[email],
        #     headers={'Reply-To': settings.DEFAULT_FROM_EMAIL},
        # )
        # msg.send(fail_silently=False)

        # return the frontend redirect
        otp_path = reverse('verify_otp', kwargs={'link_id': link_id})
        return Response({'redirect_url': settings.FRONTEND_BASE_URL + otp_path})

    except ValidationError:
        return Response({'error': 'Please enter a valid email address.'},
                        status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.exception("Error in requestor_email_entry")
        return Response(
            {'error': 'Server error. Check logs for details.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@csrf_exempt
@api_view(['POST'])
def verify_owner_otp(request, email):
    entry = cache.get(f"owner_auth:{email}")
    otp_sub = request.data.get('otp')
    if not entry or timezone.now() > entry['expiry']:
        return Response({'error': 'OTP expired'}, status=400)
    if entry['otp'] != otp_sub:
        return Response({'error': 'Wrong OTP'}, status=400)

    # mark as “logged in” (e.g. set a short‐lived token or flag in cache)
    cache.set(f"owner_logged_in:{email}", True, 3600)
    return Response({'message': 'verified'}, status=200)


@csrf_exempt
@api_view(['POST'])
def verify_req_otp(request, email):
    entry = cache.get(f"req_auth:{email}")
    otp_sub = request.data.get('otp')
    if not entry or timezone.now() > entry['expiry']:
        return Response({'error': 'OTP expired'}, status=400)
    if entry['otp'] != otp_sub:
        return Response({'error': 'Wrong OTP'}, status=400)

    # mark as “logged in” (e.g. set a short‐lived token or flag in cache)
    cache.set(f"req_logged_in:{email}", True, 3600)
    return Response({'message': 'verified'}, status=200)


@csrf_exempt
@api_view(['GET', 'POST'])
def verify_otp(request, link_id):
    try:
        nlink = NLink.objects.get(requestor_link=link_id)
        requestor = Requestor.objects.get(
            requestor_email=nlink.requestor_email)
    except (NLink.DoesNotExist, Requestor.DoesNotExist):
        return Response({'error': 'Invalid link or email.'},
                        status=status.HTTP_400_BAD_REQUEST)

    # --- GET: resend the existing OTP ---
    if request.method == 'GET':
        # optionally bump expiry
        requestor.otp_expiry = timezone.now() + datetime.timedelta(minutes=10)
        requestor.save()

        # try:
        #     msg = EmailMultiAlternatives(
        #         subject='DART System One-Time Password',
        #         body=f'Use OTP: {requestor.otp}',
        #         from_email=settings.DEFAULT_FROM_EMAIL,
        #         to=[requestor.requestor_email],
        #         headers={"Reply-To": settings.DEFAULT_FROM_EMAIL},
        #     )
        #     msg.send(fail_silently=False)
        # except Exception:
        #     return Response(
        #         {'error': 'Unable to send OTP email. Please try again later.'},
        #         status=status.HTTP_500_INTERNAL_SERVER_ERROR
        #     )

        # print(f"Resent OTP to {requestor.requestor_email}: {requestor.otp}")

        return Response({'message': 'OTP resent successfully.'},
                        status=status.HTTP_200_OK)

    # --- POST: check submitted OTP ---
    if request.method == 'POST':
        otp = request.data.get('otp')
        if timezone.now() > requestor.otp_expiry:
            return Response({'error': 'OTP expired. Please resend and try again.'},
                            status=status.HTTP_400_BAD_REQUEST)

        if requestor.otp == otp:
            requestor.is_verified = True
            requestor.otp_expiry = timezone.now()
            requestor.save()
            access_url = reverse('request_access', kwargs={'link_id': link_id})
            return Response({'redirect_url': access_url})
        else:
            return Response({'error': 'Invalid OTP. Please try again.'},
                            status=status.HTTP_400_BAD_REQUEST)

    return Response({'error': 'Method not allowed.'},
                    status=status.HTTP_405_METHOD_NOT_ALLOWED)


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
        raise ValueError(f"Owner email not found for ID: {nlink.owner_id}")

    subject = "License Agreement"
    body = (
        f"Hello,\n\n"
        f"Please review the attached license documents for your negotiation.\n"
        f"Requestor Email: {nlink.requestor_email}\n\n"
        f"Best,\nDART System"
    )
    # email = EmailMultiAlternatives(
    #     subject=subject,
    #     body=body,
    #     from_email=settings.DEFAULT_FROM_EMAIL,
    #     to=[owner_email],
    # )

    # for filename, content, mimetype in attachments:
    #     email.attach(filename, content, mimetype)

    # email.send()


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
            export_summary_to_drt()
            if not negotiation.archived:
                archive_negotiation(negotiation)
    except Exception as e:
        logger.error(
            f"Error processing negotiation {negotiation.negotiation_id}: {e}")
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
        archive_url = reverse('archive_negotiation', kwargs={
                              'negotiation_id': negotiation.negotiation_id})
        return JsonResponse({'archive_url': archive_url})
    except NoReverseMatch as e:
        logger.error(
            f"Reverse URL error for negotiation {negotiation.negotiation_id}: {e}")
        return JsonResponse({'error': _('Invalid negotiation ID')}, status=400)


def export_summary_to_drt_view(request):
    """
    HTTP GET → run the per-dataset export_summary_to_drt and return JSON status.
    """
    try:
        # call your exporter (which now takes no args)
        export_summary_to_drt()
        return JsonResponse({'message': 'Summary statistics exported successfully.'})
    except Exception as e:
        logger.error(
            f"Failed to export summary stats via HTTP: {e}", exc_info=True)
        return JsonResponse({'error': str(e)}, status=500)


def export_summary_to_drt():
    """
    Aggregate and store anonymized summary statistics *per* dataset_ID.
    """
    # First, build a queryset that joins NLink → Negotiation and groups by dataset_ID
    per_dataset_stats = (
        NLink.objects
        # group key
        .values('owner_id', 'dataset_ID')
        .annotate(
            total_requests=Count('negotiation'),
            completed_requests=Count('negotiation', filter=Q(
                negotiation__state='completed')),
            rejected_requests=Count('negotiation', filter=Q(
                negotiation__state='rejected')),
            requestor_open=Count('negotiation', filter=Q(
                negotiation__state='requestor_open')),
            owner_open=Count('negotiation', filter=Q(
                negotiation__state='owner_open')),
            # If you want average response time (assuming timestamps is a DurationField)
            # average_response_time=Avg(F('negotiation__response_time')),
        )
    )

    for entry in per_dataset_stats:
        owner_pk = entry['owner_id']
        ds_id = entry['dataset_ID']

        nlink = NLink.objects.filter(
            owner_id=owner_pk, dataset_ID=ds_id).first()
        if not nlink:
            logger.warning(
                f"Skipping summary for owner={owner_pk}, dataset={ds_id}: no NLink found."
            )
            continue

        # Pull domain‐counts just for this dataset
        domain_qs = (
            NLink.objects
            .filter(owner_id=owner_pk, dataset_ID=ds_id)
            .values(domain=F('requestor_email'))
            .annotate(request_count=Count('negotiation'))
        )
        requestor_domains = {d['domain']: d['request_count']
                             for d in domain_qs}

        # Build payload
        summary_data = {
            'owner_id': nlink,  # if you have a single owner per dataset, fetch it here
            'datasets_requested': [ds_id],
            'overall_stat': {
                'total_requests':       entry['total_requests'],
                'accepted_requests':    entry['completed_requests'],
                'rejected_requests':    entry['rejected_requests'],
                'requestor_open':       entry['requestor_open'],
                'owner_open':           entry['owner_open'],
                # 'average_response_time': str(entry['average_response_time']) if entry['average_response_time'] else None,
                'requestor_domains':    requestor_domains,
                'generated_at':         timezone.now().isoformat(),
            }
        }

        owner = summary_data.pop('owner_id')
        datasets = summary_data.pop('datasets_requested')

        try:
            SummaryStatistic.objects.update_or_create(
                owner_id=owner,
                datasets_requested=datasets,        # match on exactly that list
                defaults={'overall_stat': summary_data['overall_stat']}
            )
        except Exception as e:
            logger.error(
                f"Failed to create SummaryStatistic for owner={owner_pk}, "
                f"dataset={ds_id}: {e}"
            )


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


def negotiation_list_api_req(request, email):
    # only pull negotiations whose NLink.requestor_email matches
    qs = Negotiation.objects.select_related(
        'link').filter(link__requestor_email=email)

    data = []
    for n in qs:
        requestor_link = getattr(n, 'link', None)
        data.append({
            'negotiation_id': str(n.negotiation_id),
            'conversation_id': str(n.conversation_id),
            'requestor_responses': n.requestor_responses,
            'owner_responses': n.owner_responses,
            'comments': n.comments,
            'state': n.state,
            # 'reminder_sent': n.reminder_sent,
            # 'questionnaire_SAID': n.questionnaire_SAID,
            'timestamps': n.timestamps.isoformat(),
            # 'archived': n.archived,
            'requestor_link': str(requestor_link.requestor_link) if requestor_link else None,
        })

    return JsonResponse(data, safe=False)

#all negotioations. not only for specific owner!
def negotiation_list_api(request):
    qs = Negotiation.objects.all().select_related('link')
    data = []
    for n in qs:
        owner_link = getattr(n, 'link', None)
        data.append({
            'negotiation_id': str(n.negotiation_id),
            'conversation_id': str(n.conversation_id),
            'requestor_responses': n.requestor_responses,
            'owner_responses': n.owner_responses,
            'comments': n.comments,
            'state': n.state,
            'reminder_sent': n.reminder_sent,
            'questionnaire_SAID': n.questionnaire_SAID,
            'timestamps': n.timestamps.isoformat(),
            'archived': n.archived,
            'owner_link': str(owner_link.owner_link) if owner_link else None,
        })
    return JsonResponse(data, safe=False)


# def negotiation_list_api(request):
#     """Return all negotiations as JSON."""
#     qs = Negotiation.objects.all().values(
#         'negotiation_id',
#         'conversation_id',
#         'requestor_responses',
#         'owner_responses',
#         'comments',
#         'state',
#         'reminder_sent',
#         'questionnaire_SAID',
#         'timestamps',
#         'archived',
#     )
#     data = list(qs)
#     return JsonResponse(data, safe=False)

# Manually trigger deletion of old negotiations


def delete_old_negotiations_view(request):
    """Manually trigger the deletion of old negotiations."""
    return delete_old_negotiations()


@receiver(post_save, sender=Negotiation)
def generate_summary_statistics(sender, instance, **kwargs):
    """Auto-archive and export statistics when a negotiation is completed, canceled, or rejected."""
    if instance.state in ['completed', 'canceled', 'rejected'] and not instance.archived:
        handle_negotiation_archive_and_summary(instance)


# @login_required
def summary_statistics_view(request, owner_id):
    """Endpoint for retrieving summary statistics based on the provided owner_id (string)."""
    try:
        stats_qs = SummaryStatistic.objects.filter(owner_id__owner_id=owner_id)

        if not stats_qs.exists():
            logger.warning(
                f"No SummaryStatistic found for owner_id={owner_id}")
            return JsonResponse({'error': 'No summary statistics found.'}, status=404)

        logger.debug(
            f"Retrieved {stats_qs.count()} SummaryStatistic row(s) for owner {owner_id}")

        statistics_data = []
        for stat in stats_qs:
            ds_list = stat.datasets_requested or []
            dataset_id = ds_list[0] if ds_list else None

            stats_block = stat.overall_stat or {}
            statistics_data.append({
                'dataset_id':               dataset_id,
                'total_requests':           stats_block.get('total_requests', 0),
                'accepted_requests':        stats_block.get('accepted_requests', 0),
                'rejected_requests':        stats_block.get('rejected_requests', 0),
                'requestor_open':           stats_block.get('requestor_open', 0),
                'owner_open':               stats_block.get('owner_open', 0),
                # 'average_response_time':    stats_block.get('average_response_time', 'N/A'),
                'generated_at':             stat.summary_date.isoformat(),
            })

        return JsonResponse({'summary_statistics': statistics_data})

    except ObjectDoesNotExist:
        return JsonResponse({'error': 'Owner statistics not found.'}, status=404)
    except Exception as e:
        logger.error(f"Error in summary_statistics_view: {e}")
        return JsonResponse({'error': 'Internal server error.'}, status=500)


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
        return JsonResponse({"error": "Only POST requests are allowed."}, status=405)

    submission = json.loads(request.body)
    print("submission:", submission)  # <<–– debug
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
