import uuid
from django.shortcuts import render, redirect, get_object_or_404
from django.core.mail import send_mail
from django.urls import reverse
from django.http import HttpResponse
from .models import Requestor, NLink, Questionnaire
from .forms import RequestorEmailForm, QuestionnaireForm

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
