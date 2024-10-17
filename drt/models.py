from django.db import models
import uuid
from datetime import datetime, timedelta

class Requestor(models.Model):
    requestor_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    requestor_email = models.EmailField(unique=True)
    otp = models.CharField(max_length=6)
    otp_expiry = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)

class Negotiation(models.Model):
    negotiation_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    requestor_responses = models.JSONField() 
    owner_responses = models.JSONField() 
    negotiation_status = models.CharField(max_length=50)  # open, completed, archived.
    questionnaire_SAID = models.CharField(max_length=255)  # Changed to CharField
    timestamps = models.DateTimeField(auto_now_add=True)

class NLink(models.Model):
    link_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    negotiation_id = models.ForeignKey(Negotiation, on_delete=models.CASCADE, null=True, blank=True)
    owner_id = models.CharField(max_length=255, null=True, blank=True)
    requestor_id = models.ForeignKey(Requestor, on_delete=models.CASCADE, null=True, blank=True) 
    questionnaire_SAID = models.CharField(max_length=255, null=True, blank=True)
    expiration_date = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now_add=True)

class Archive(models.Model):
    id = models.BigAutoField(primary_key=True)
    negotiation_id = models.ForeignKey(Negotiation, on_delete=models.CASCADE)
    archived_timestamp = models.DateTimeField(auto_now_add=True)
    archived_data = models.JSONField()

class SummaryStatistics(models.Model):
    id = models.BigAutoField(primary_key=True)
    owner_id = models.CharField(max_length=255)  # Changed to CharField
    summary_date = models.DateTimeField(auto_now_add=True)
    datasets_requested = models.JSONField()
    overall_stat = models.JSONField()
