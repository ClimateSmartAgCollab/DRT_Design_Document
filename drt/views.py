from django.shortcuts import render, redirect, get_object_or_404
from django.core.mail import send_mail
from django.urls import NoReverseMatch, reverse
from django.http import HttpResponseNotFound, JsonResponse
from django.utils.crypto import get_random_string
from django.core.cache import cache
from django.core.validators import validate_email
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.db import transaction
from django.db.models.signals import post_save
from django.db.models import Avg, Count, F, Q
from django.utils.translation import gettext_lazy as _
from django.dispatch import receiver
from rest_framework.decorators import api_view
from django.contrib.auth.decorators import login_required
from rest_framework.response import Response
from .models import Requestor, NLink, Negotiation, Archive, SummaryStatistic
from .forms import QuestionnaireForm
import uuid
import datetime
import logging




logger = logging.getLogger(__name__)


@api_view()
def generate_nlinks(request, link_id):
    link_table = cache.get('link_table')
    if not link_table:
        logger.error("Link table not found in cache.")
        return Response({'error': 'Link table not found in cache'}, status=404)

    # Find the appropriate link data
    example_link = next((data for url, data in link_table.items() if link_id in url), None)
    if not example_link:
        logger.warning(f"Link ID {link_id} not found in cache.")
        return Response({'error': f'Link ID {link_id} not found'}, status=404)

    # Create a new Negotiation instance
    negotiation = Negotiation.objects.create(
        questionnaire_SAID=example_link['questionnaire_id'],
        state='requestor_open'
    )
    logger.info(f"Negotiation created with ID: {negotiation.negotiation_id}")

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


    # Redirect the requestor to the email entry page
    return redirect('requestor_email_entry', link_id=requestor_link_id)


@csrf_exempt
@api_view(['GET', 'POST'])
def requestor_email_entry(request, link_id):
    if request.method == 'POST':
        email = request.POST.get('email')

        # Validate the email format
        try:
            validate_email(email)
        except ValidationError:
            # Email format is invalid, re-render the form with an error message
            return render(request, 'email_entry.html', {
                'link_id': link_id,
                'error_message': 'Please enter a valid email address.'
            })
        

        otp = get_random_string(6, '0123456789')  # Generate 6-digit OTP

        # Store requestor email and OTP in DB
        requestor = Requestor.objects.create(
            requestor_email=email,
            otp=otp,
            otp_expiry= timezone.now() + datetime.timedelta(minutes=10), 
            is_verified=False  # Not verified yet
        )

        # Update the NLink with the requestor email
        nlink = NLink.objects.get(requestor_link=link_id)
        nlink.requestor_email = email
        nlink.save()

        # Simulate sending OTP (for now, just print it)
        print(f"OTP sent to {email}: {otp}")

        # Redirect to the OTP verification page
        otp_verification_url = reverse('verify_otp', kwargs={'link_id': link_id})
        return redirect(otp_verification_url)

    return render(request, 'email_entry.html', {'link_id': link_id})


@csrf_exempt
@api_view(['GET', 'POST'])
def verify_otp(request, link_id):
    if request.method == 'POST':
        otp = request.POST.get('otp')

        try:
            nlink = NLink.objects.get(requestor_link=link_id)
            requestor = Requestor.objects.get(requestor_email=nlink.requestor_email)
        except (NLink.DoesNotExist, Requestor.DoesNotExist):
            return Response({'error': 'Invalid request'}, status=400)

        # Check if OTP has expired
        if timezone.now() > requestor.otp_expiry:
            # OTP has expired, generate a new one
            new_otp = get_random_string(6, '0123456789')
            requestor.otp = new_otp
            requestor.otp_expiry = timezone.now() + datetime.timedelta(minutes=10)
            requestor.save()

            # Simulate sending new OTP (for now, just print it)
            print(f"New OTP sent to {requestor.requestor_email}: {new_otp}")

            return render(request, 'otp_verification.html', {
                'link_id': link_id,
                'error_message': 'OTP expired. A new OTP has been sent to your email.'
            })

        # Check if the provided OTP is correct
        if requestor.otp == otp:
            requestor.is_verified = True
            requestor.otp_expiry = timezone.now()  # Clear the OTP expiration
            requestor.save()

            # Redirect to the request_access view with the link_id
            access_url = reverse('request_access', kwargs={'link_id': link_id})
            return redirect(access_url)

        # If OTP is incorrect, show error message
        return render(request, 'otp_verification.html', {
            'link_id': link_id,
            'error_message': 'Invalid OTP. Please try again.'
        })

    return render(request, 'otp_verification.html', {'link_id': link_id})



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
 
    if negotiation.state == 'owner_open':
        return Response('The questionnaire is submitted and cannot be edited.')
    
    if negotiation.state == 'completed':
        return Response('The negotiation is completed and cannot be edited.')  

    if negotiation.state == 'rejected':
        return Response('The negotiation is rejected and cannot be edited.')         

    if request.method == 'POST':
        form = QuestionnaireForm(request.POST, instance=negotiation)
        if form.is_valid():
            if 'save' in request.POST:
                form.save()
                return Response('Questionnaire saved successfully!')
            
            elif 'submit' in request.POST:
                negotiation.state = 'owner_open'
                form.save()

                send_mail(
                    'Your Data Request Submission Confirmation',
                    f'Your request has been submitted successfully.\n\nSubmission Details:\n{negotiation.requestor_responses}',
                    'noreply@dart-system.com',
                    [nlink.requestor_email]
                )

                owner_table = cache.get("owner_table")
                owner_email = owner_table[nlink.owner_id]["owner_email"]

                owner_review_url = request.build_absolute_uri(
                    reverse('owner_review', kwargs={'uuid': nlink.owner_link})
                )
                send_mail(
                    'New Data Request to Review',
                    f'A new data request has been submitted. Please review it at {owner_review_url}',
                    'noreply@dart-system.com',
                    [owner_email]
                )

                negotiation.save()
                return Response('Questionnaire submitted successfully!')

    else:
        # Initialize the form with existing negotiation data
        form = QuestionnaireForm(instance=negotiation)

    return render(request, 'fill_questionnaire.html', {'form': form})


@api_view(['GET', 'POST'])
def owner_review(request, uuid):
    nlink = get_object_or_404(NLink, owner_link=uuid)
    negotiation = nlink.negotiation

    if negotiation.state == 'requestor_open':
        return Response('The questionnaire is requestor_open and cannot be edited by the owner.')

    if negotiation.state == 'completed':
        return Response('The negotiation is completed and cannot be edited.')    

    if request.method == 'POST':
        if 'save' in request.POST:
            negotiation.owner_responses = request.POST.get('owner_responses')
            negotiation.comments = request.POST.get('comments')
            negotiation.save()
            return Response({'message': 'Review saved successfully!'})

        elif 'request_clarification' in request.POST:
            negotiation.state = 'requestor_open'
            send_clarification_email(nlink.requestor_email, nlink.link_id)
            negotiation.save()
            return Response({'message': 'Clarification requested!'})

        elif 'accept' in request.POST:
            negotiation.state = 'completed'
            negotiation.save()
            generate_license_and_notify_owner(nlink)
            return Response({'message': 'Request accepted, license generated!'})

        elif 'reject' in request.POST:
            negotiation.state = 'rejected'
            negotiation.save()
            return Response({'message': 'Request rejected!'})

    return render(request, 'owner_review.html', {'negotiation': negotiation})




# def generate_license_document(responses):
#     return f"License Document:\n{responses}"


def generate_license_and_notify_owner(nlink):
    negotiation = nlink.negotiation

    owner_table = cache.get("owner_table")
    owner_email = owner_table[nlink.owner_id]["owner_email"]    

    # license_content = generate_license_document(negotiation.requestor_responses)
    
    send_mail(
        'Your License Agreement',
        f'Please review the attached license agreement.\nRequestor Email: {nlink.requestor_email}',
        'noreply@dart-system.com',
        [owner_email],
        # attachments=[license_content]
    )


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