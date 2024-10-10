import random
from django.core.mail import send_mail
from django.shortcuts import render, redirect, get_object_or_404
from .models import Requestor, Owner, NLink, Questionnaire, Negotiation, SummaryStatistics

# Generate and send OTP
def generate_and_send_otp(requestor):
    otp = str(random.randint(100000, 999999))  # 6-digit OTP
    requestor.otp_code = otp
    requestor.save()
    
    # Send OTP via email
    send_mail(
        'Your OTP Code',
        f'Your OTP is {otp}. Please verify your email.',
        'from@example.com',
        [requestor.email],
        fail_silently=False,
    )

# Email verification view
def verify_email(request, requestor_id):
    requestor = get_object_or_404(Requestor, requestor_id=requestor_id)

    if request.method == 'POST':
        entered_otp = request.POST.get('otp_code')
        if entered_otp == requestor.otp_code:
            requestor.is_verified = True
            requestor.save()
            # Generate unique link for the requestor
            nlink = NLink.objects.create(requestor=requestor, owner=requestor.owner, questionnaire=requestor.questionnaire)
            # Send the unique URL to requestor
            send_mail(
                'Complete Your Questionnaire',
                f'Click this link to complete your questionnaire: http://127.0.0.1:8000/fill-questionnaire/{nlink.link_id}/',
                'from@example.com',
                [requestor.email],
                fail_silently=False,
            )
            return redirect('otp_verified')

    return render(request, 'verify_email.html', {'requestor': requestor})

# Fill questionnaire view
def fill_questionnaire(request, link_id):
    nlink = get_object_or_404(NLink, link_id=link_id)
    questionnaire = nlink.questionnaire

    if request.method == 'POST':
        if 'save' in request.POST:
            questionnaire.saved_data = request.POST.dict()
            questionnaire.save()
            return render(request, 'fill_questionnaire.html', {'questionnaire': questionnaire, 'message': 'Data saved successfully!'})
        elif 'submit' in request.POST:
            questionnaire.is_submitted = True
            questionnaire.saved_data = request.POST.dict()
            questionnaire.save()

            # Notify the owner about the submission
            send_mail(
                'Questionnaire Submission',
                f'The requestor has submitted a questionnaire. Review it here: http://127.0.0.1:8000/review-questionnaire/{nlink.link_id}/',
                'from@example.com',
                [nlink.owner.email],
                fail_silently=False,
            )

            # Update summary statistics
            summary, created = SummaryStatistics.objects.get_or_create(owner=nlink.owner)
            summary.request_count += 1
            summary.save()

            return render(request, 'fill_questionnaire.html', {'questionnaire': questionnaire, 'message': 'Questionnaire submitted successfully!'})

    return render(request, 'fill_questionnaire.html', {'questionnaire': questionnaire})
