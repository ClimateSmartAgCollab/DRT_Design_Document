from django.shortcuts import render, redirect, get_object_or_404
from django.core.mail import send_mail
from django.urls import reverse
from django.http import HttpResponse, JsonResponse
from django.utils.crypto import get_random_string
from django.core.cache import cache
from .models import Requestor, NLink
from .forms import RequestorEmailForm, QuestionnaireForm
import uuid
import datetime


# Step 1: Fetch the link from cache and generate NLink entries in the database
def generate_nlinks(request):
    # Get link table from cache
    link_table = cache.get('link_table')
    if not link_table:
        return JsonResponse({'error': 'Link table not found in cache'}, status=404)

    # Select a sample link from the cache (for demonstration)
    example_link = next(iter(link_table.values()))

    # Generate unique IDs for requestor and owner links
    owner_link = uuid.uuid4()
    requestor_link = uuid.uuid4()

    # Create the NLink entry in the DB
    nlink = NLink.objects.create(
        owner_id=example_link['owner_id'],  # Owner ID from cache
        requestor_link=requestor_link, 
        owner_link=owner_link,
        questionnaire_SAID=example_link['questionnaire_id'],  # From cache
        expiration_date=datetime.datetime.now() + datetime.timedelta(days=7)
    )

    return JsonResponse({
        'owner_link': f'/verify/owner/{owner_link}',
        'requestor_link': f'/verify/requestor/{requestor_link}'
    })

# Step 2: Requestor submits email, and OTP is generated
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

        return JsonResponse({'status': 'OTP sent. Please verify.'})

    return render(request, 'email_entry.html', {'link_id': link_id})


# Step 3: Verify OTP and update the requestor’s status
def verify_otp(request, link_id):
    if request.method == 'POST':
        otp = request.POST.get('otp')

        # Fetch the NLink entry based on the requestor link
        nlink = NLink.objects.get(requestor_link=link_id)
        requestor = Requestor.objects.get(requestor_email=nlink.requestor_email)

        if requestor.otp == otp:
            # Mark requestor as verified and expire the OTP
            requestor.is_verified = True
            requestor.otp_expiry = True
            requestor.save()

            return JsonResponse({'status': 'Email verified successfully!'})

        return JsonResponse({'error': 'Invalid OTP'}, status=400)

    return render(request, 'otp_verification.html', {'link_id': link_id})



def request_access(request):
    if request.method == 'POST':
        form = RequestorEmailForm(request.POST)
        if form.is_valid():
            email = form.cleaned_data['email']
            requestor, created = Requestor.objects.get_or_create(
                requestor_email=email
            )
            link_uuid = uuid.uuid4()
            NLink.objects.create(
                link_id=link_uuid,
                requestor_id=requestor,
                owner_id=None,  # Adjust based on ownership logic
                questionnaire_SAID=None,  # Placeholder for now
            )
            link = request.build_absolute_uri(
                reverse('fill_questionnaire', kwargs={'uuid': link_uuid})
            )
            send_mail(
                'Your Questionnaire Link',
                f'Click the following link to access the questionnaire: {link}',
                'your-email@example.com',
                [email],
            )
            return HttpResponse('An email with the access link has been sent.')
    else:
        form = RequestorEmailForm()
    return render(request, 'request_access.html', {'form': form})

def fill_questionnaire(request, uuid):
    """Displays the form to the requestor based on the UUID link."""
    link = get_object_or_404(NLink, link_id=uuid)
    questionnaire = link.questionnaire_SAID 
    print(questionnaire)

    if request.method == 'POST':
        form = QuestionnaireForm(request.POST, instance=questionnaire)
        if form.is_valid():
            questionnaire.is_submitted = True 
            form.save()
            return HttpResponse('Questionnaire submitted successfully!')
    else:
        form = QuestionnaireForm(instance=questionnaire)

    return render(request, 'fill_questionnaire.html', {'form': form})
