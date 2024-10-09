from django.db import models
import uuid
from datetime import datetime, timedelta

class Owner(models.Model):
    owner_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    email = models.EmailField()

class Requestor(models.Model):
    requestor_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField()

class Questionnaire(models.Model):
    questionnaire_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    schema = models.JSONField()  # Stores the questionnaire structure in JSON
    metadata = models.JSONField()

class Negotiation(models.Model):
    negotiation_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(Owner, on_delete=models.CASCADE)
    requestor = models.ForeignKey(Requestor, on_delete=models.CASCADE)
    questionnaire = models.ForeignKey(Questionnaire, on_delete=models.CASCADE)
    state = models.CharField(max_length=50)  # requestor_open, owner_open, completed
    status = models.CharField(max_length=50)  # pending, approved, rejected
    link_created_at = models.DateTimeField(auto_now_add=True)

    def has_expired(self):
        expiration_time = self.link_created_at + timedelta(days=1)  # 1-day expiration
        return datetime.now() > expiration_time
