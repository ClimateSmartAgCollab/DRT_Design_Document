from django.shortcuts import render, redirect, get_object_or_404
from django.core.mail import send_mail
from .models import Requestor, Owner, Negotiation, Questionnaire

# Generate UUID7 links and send them via email
def send_request_link(requestor_email, negotiation):
    uuid_link = negotiation.negotiation_id  # UUID7 link
    url = f"http://127.0.0.1:8000/edit-request/{uuid_link}/"  # Link for editing request

    # Send link to requestor
    send_mail(
        'Edit Your Request',
        f'Click this link to edit your request: {url}. The link expires in 24 hours.',
        'from@example.com',
        [requestor_email],
        fail_silently=False,
    )

# Handle the submission of a new request
def submit_request(request):
    if request.method == 'POST':
        email = request.POST.get('email')
        owner_id = request.POST.get('owner_id')

        # Find requestor and owner
        requestor, created = Requestor.objects.get_or_create(email=email)
        owner = get_object_or_404(Owner, owner_id=owner_id)

        # Create the questionnaire (fetch from cache or API)
        questionnaire_data = {"q1": "What is your name?", "q2": "How old are you?"}  # Sample data
        questionnaire = Questionnaire.objects.create(schema=questionnaire_data)

        # Create negotiation
        negotiation = Negotiation.objects.create(
            owner=owner,
            requestor=requestor,
            questionnaire=questionnaire,
            state='requestor_open',
            status='pending'
        )

        # Send the link to the requestor
        send_request_link(requestor.email, negotiation)
        return redirect('negotiation_status', negotiation_id=negotiation.negotiation_id)

    return render(request, 'submit_request.html')

# Handle editing the request based on UUID7 link
def edit_request(request, uuid_link):
    negotiation = get_object_or_404(Negotiation, negotiation_id=uuid_link)
    
    if negotiation.has_expired():
        return render(request, 'link_expired.html')
    
    return render(request, 'edit_request.html', {'negotiation': negotiation})
