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

    # Assume a specific link is selected (for simplicity, let's pick one)
    example_link = next(iter(link_table.values()))  # Fetch any link entry for demo

    # Generate new links for owner and requestor
    owner_link_id = str(uuid.uuid4())
    requestor_link_id = str(uuid.uuid4())

    # Create the NLink entry in the DB with the owner ID from the cache
    nlink = NLink.objects.create(
        link_id=owner_link_id,  # Owner link ID
        owner_id=example_link['owner_id'],  # Owner ID from the cache
        questionnaire_SAID=example_link['questionnaire_id'],  # From cache
        expiration_date=datetime.datetime.now() + datetime.timedelta(days=7)
    )

    # Create a separate NLink entry for the requestor link
    NLink.objects.create(
        link_id=requestor_link_id,  # Requestor link ID
        questionnaire_SAID=example_link['questionnaire_id'],  # From cache
        expiration_date=datetime.datetime.now() + datetime.timedelta(days=7)
    )

    # Return the generated links to the frontend
    return JsonResponse({
        'owner_link': f'/verify/owner/{owner_link_id}',
        'requestor_link': f'/verify/requestor/{requestor_link_id}'
    })


# Step 2: Requestor submits email, and OTP is generated
def requestor_email_entry(request, link_id):
    if request.method == 'POST':
        email = request.POST.get('email')
        otp = get_random_string(6, '0123456789')  # Generate a 6-digit OTP

        # Create the requestor entry in the DB
        requestor = Requestor.objects.create(
            requestor_email=email,
            otp=otp,
            otp_expiray=False,  # Initially false until verified
            is_verified=False  # Initially not verified
        )

        # Store requestor_id in the nlink table for this link
        nlink = get_object_or_404(NLink, link_id=link_id)
        nlink.requestor_id = requestor  # ForeignKey assignment
        nlink.save()

        # Simulate sending OTP (for now, just print it)
        print(f"OTP sent to {email}: {otp}")

        return JsonResponse({'status': 'OTP sent to your email. Please verify.'})

    return render(request, 'email_entry.html', {'link_id': link_id})


# Step 3: Verify OTP and update the requestor’s status
def verify_otp(request, link_id):
    if request.method == 'POST':
        otp = request.POST.get('otp')
        nlink = get_object_or_404(NLink, link_id=link_id)

        # Correct the reference to requestor
        requestor = nlink.requestor_id

        # Check if the OTP matches and handle expiration
        if requestor.otp == otp:
            if requestor.otp_expiry and requestor.otp_expiry < datetime.datetime.now():
                return JsonResponse({'error': 'OTP has expired'}, status=400)
            
            requestor.otp_expiry = True  # OTP is now expired
            requestor.is_verified = True  # Mark as verified
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
