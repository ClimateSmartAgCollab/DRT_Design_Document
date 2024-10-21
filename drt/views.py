from django.shortcuts import render, redirect, get_object_or_404
from django.core.mail import send_mail
from django.urls import reverse
from django.http import HttpResponse, JsonResponse
from django.utils.crypto import get_random_string
from django.core.cache import cache
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Requestor, NLink, Negotiation
from .forms import QuestionnaireForm
import uuid
import datetime

@api_view()
def generate_nlinks(request, link_id):
    link_table = cache.get('link_table')
    if not link_table:
        return Response({'error': 'Link table not found in cache'}, status=404)

    # Search for the row that contains the given link_id in its key
    example_link = None
    for url, link_data in link_table.items():
        if link_id in url:
            example_link = link_data
            break

    if not example_link:
        return Response({'error': f'Link ID {link_id} not found in cache'}, status=404)

    # Generate unique links for owner and requestor
    owner_link_id = uuid.uuid4()
    requestor_link_id = uuid.uuid4()

    nlink = NLink.objects.create(
        owner_id=example_link['owner_id'],  # Owner ID from cache
        license_id = example_link['license_id'],  # Owner ID from cache
        dataset_ID = example_link['data_label'],  # Owner ID from cache
        requestor_link=requestor_link_id,
        owner_link=owner_link_id,
        questionnaire_SAID=example_link['questionnaire_id'],  # Questionnaire ID from cache
        expiration_date=datetime.datetime.now() + datetime.timedelta(days=7)
    )

    # Create the corresponding Negotiation entry if it doesn't exist
    negotiation, created = Negotiation.objects.get_or_create(
        questionnaire_SAID=nlink.questionnaire_SAID,
        defaults={
            'state': 'requestor_open',
            'negotiation_status': 'open',
        }
    )

    # Redirect the requestor to the email entry page
    return redirect('requestor_email_entry', link_id=requestor_link_id)


# Step 2: Requestor submits email, and OTP is generated
@csrf_exempt
@api_view(['GET', 'POST'])
def requestor_email_entry(request, link_id):
    if request.method == 'POST':
        email = request.POST.get('email')
        otp = get_random_string(6, '0123456789')  # Generate 6-digit OTP

        # Store requestor email and OTP in DB
        requestor = Requestor.objects.create(
            requestor_email=email,
            otp=otp,
            otp_expiry=False,  # Set to False initially
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


# Step 3: Verify OTP and update the requestor’s status
@csrf_exempt
@api_view(['GET', 'POST'])
def verify_otp(request, link_id):
    if request.method == 'POST':
        otp = request.POST.get('otp')

        nlink = NLink.objects.get(requestor_link=link_id)
        requestor = Requestor.objects.get(requestor_email=nlink.requestor_email)

        if requestor.otp == otp:
            requestor.is_verified = True
            requestor.otp_expiry = True
            requestor.save()
            
            # Redirect to the request_access view with the link_id
            access_url = reverse('request_access', kwargs={'link_id': link_id})
            return redirect(access_url)

        return Response({'error': 'Invalid OTP'}, status=400)

    return render(request, 'otp_verification.html', {'link_id': link_id})



# Step 4: After verification send the requestor a direct link to access the questionnaire.
@api_view()
def request_access(request, link_id):
    """Send the requestor a direct link to access the questionnaire."""
    
    # Fetch the NLink entry using the provided link_id (requestor_link)
    nlink = get_object_or_404(NLink, requestor_link=link_id)

    # Build the URL to access the questionnaire using the requestor's link_id
    questionnaire_url = request.build_absolute_uri(
        reverse('fill_questionnaire', kwargs={'uuid': nlink.requestor_link})
    )

    # Simulate sending the questionnaire link (or print for demo purposes)
    print(f"Questionnaire Link: {questionnaire_url}")

    return Response({'status': 'Link sent successfully!', 'link': questionnaire_url})



# Step 5: Displays the form to the requestor based on the UUID link.
@csrf_exempt
@api_view(['GET', 'POST'])
def fill_questionnaire(request, uuid):
    """Displays the form to the requestor or owner based on the UUID link."""

    # Fetch the NLink entry using the requestor link ID (UUID)
    nlink = get_object_or_404(NLink, requestor_link=uuid)

    # Fetch the corresponding negotiation using the questionnaire SAID
    negotiation = get_object_or_404(Negotiation, questionnaire_SAID=nlink.questionnaire_SAID)

    # Check if the form is already submitted (state = 'owner open')
    if negotiation.state == 'owner_open':
        return Response('The questionnaire is submitted and cannot be edited.')

    # Handle form submission or save
    if request.method == 'POST':
        form = QuestionnaireForm(request.POST, instance=negotiation, questionnaire_SAID=nlink.questionnaire_SAID)
        if form.is_valid():
            if 'submit' in request.POST:  # Check if the requestor clicked 'Submit'
                negotiation.state = 'owner_open'  # Change state to 'owner_open'
                negotiation.negotiation_status = 'completed'  # Mark as completed
            form.save()
            return Response('Questionnaire saved successfully!')

    else:
        form = QuestionnaireForm(instance=negotiation, questionnaire_SAID=nlink.questionnaire_SAID)

    return render(request, 'fill_questionnaire.html', {'form': form})



