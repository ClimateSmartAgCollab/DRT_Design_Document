from django.db import models

# Create your models here.

from django.db import models
import uuid

class Owner(models.Model):
    owner_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    email = models.EmailField()

class Requestor(models.Model):
    requestor_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField()

class Questionnaire(models.Model):
    questionnaire_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    schema = models.JSONField()  # Fetch and cache from GitHub
    metadata = models.JSONField()

class Negotiation(models.Model):
    negotiation_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(Owner, on_delete=models.CASCADE)
    requestor = models.ForeignKey(Requestor, on_delete=models.CASCADE)
    questionnaire = models.ForeignKey(Questionnaire, on_delete=models.CASCADE)
    state = models.CharField(max_length=50)  # open, in-progress, etc.
    status = models.CharField(max_length=50)  # completed, rejected, etc.

class OutputDocument(models.Model):
    output_document_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    negotiation = models.ForeignKey(Negotiation, on_delete=models.CASCADE)
    output_type = models.CharField(max_length=50)  # license or query
    output_payload = models.JSONField()
