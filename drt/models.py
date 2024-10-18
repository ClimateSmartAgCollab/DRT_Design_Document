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
    conversation_id = models.UUIDField(default=uuid.uuid4, editable=False)  # Conversation round ID
    requestor_responses = models.JSONField(null=True, blank=True)  # Requestor’s answers
    owner_responses = models.JSONField(null=True, blank=True)  # Owner’s feedback
    state = models.CharField(max_length=50, default='requestor_open')  # Tracks current state
    negotiation_status = models.CharField(max_length=50, default='open')  # open/completed/archived
    questionnaire_SAID = models.CharField(max_length=255)  # SAID of the questionnaire
    timestamps = models.DateTimeField(auto_now_add=True)  # Track conversation start time

class NLink(models.Model):
    link_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    negotiation_id = models.ForeignKey(Negotiation, on_delete=models.CASCADE, null=True, blank=True)
    owner_id = models.CharField(max_length=255, null=True, blank=True)  # Fetched from cache
    license_id = models.CharField(max_length=255, null=True, blank=True)  # Fetched from cache
    dataset_ID = models.CharField(max_length=255, null=True, blank=True)  # Fetched from cache
    requestor_email = models.EmailField(null=True, blank=True)  # Set after verification
    requestor_link = models.UUIDField(default=uuid.uuid4, editable=False)  # Unique requestor link
    owner_link = models.UUIDField(default=uuid.uuid4, editable=False)  # Unique owner link
    questionnaire_SAID = models.CharField(max_length=255, null=True, blank=True)
    state = models.CharField(max_length=50, default='requestor_open')  # Tracks current state
    negotiation_status = models.CharField(max_length=50, default='open')  # Status: open, completed, archived
    expiration_date = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)

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
