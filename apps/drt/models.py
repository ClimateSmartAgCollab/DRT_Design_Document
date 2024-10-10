from django.db import models
import uuid
# from uuid6 import uuid7
from datetime import datetime, timedelta

# Updated Owner model
class Owner(models.Model):
    owner_id = models.CharField(max_length=255, primary_key=True)  # Based on 'username' from CSV
    email = models.EmailField()

# Requestor model
class Requestor(models.Model):
    requestor_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    otp_code = models.CharField(max_length=6)  # For OTP storage
    is_verified = models.BooleanField(default=False)

# Questionnaire model for storing questionnaire data
class Questionnaire(models.Model):
    questionnaire_id = models.CharField(max_length=255, primary_key=True)  # Based on 'questionnaire_SAID'
    owner = models.ForeignKey(Owner, on_delete=models.CASCADE)
    schema = models.JSONField()  # Stores the questionnaire structure in JSON
    is_submitted = models.BooleanField(default=False)  # Track submission status
    saved_data = models.JSONField(blank=True, null=True)  # For saved requestor dat

# NLink model for tracking links and negotiations
class NLink(models.Model):
    # link_id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    link_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(Owner, on_delete=models.CASCADE)
    requestor = models.ForeignKey(Requestor, on_delete=models.CASCADE)
    questionnaire = models.ForeignKey(Questionnaire, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    expired = models.BooleanField(default=False)

# Negotiation model to track interactions between requestor and owner
class Negotiation(models.Model):
    # negotiation_id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    negotiation_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nlink = models.ForeignKey(NLink, on_delete=models.CASCADE)
    state = models.CharField(max_length=50)  # requestor_open, owner_open, completed, etc.
    feedback = models.TextField(blank=True, null=True)

# Archive model to store completed negotiations
class Archive(models.Model):
    id = models.BigAutoField(primary_key=True)  # Explicit BigAutoField for primary key
    negotiation = models.ForeignKey(Negotiation, on_delete=models.CASCADE)
    archived_at = models.DateTimeField(auto_now_add=True)

# Summary Statistics model to track high-level data metrics
class SummaryStatistics(models.Model):
    id = models.BigAutoField(primary_key=True)  # Explicit BigAutoField for primary key
    owner = models.ForeignKey(Owner, on_delete=models.CASCADE)
    request_count = models.IntegerField(default=0)
    average_response_time = models.FloatField(default=0.0)
    last_updated = models.DateTimeField(auto_now=True)
