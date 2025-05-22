from django.db import models
import uuid
from datetime import timedelta
from django.utils.timezone import now

# Helper function for expiration date


def default_expiration_date():
    return now() + timedelta(days=7)


class NLink(models.Model):
    link_id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False)
    negotiation = models.OneToOneField(
        'Negotiation', on_delete=models.CASCADE, related_name='link', null=True, blank=True)
    owner_id = models.CharField(max_length=255)
    license_id = models.CharField(max_length=255, null=True, blank=True)
    dataset_ID = models.CharField(max_length=255, null=True, blank=True)
    requestor_email = models.EmailField(null=True, blank=True)
    requestor_link = models.UUIDField(default=uuid.uuid4, editable=False)
    owner_link = models.UUIDField(default=uuid.uuid4, editable=False)
    # state = models.CharField(max_length=50, default='requestor_open')
    expiration_date = models.DateTimeField(default=default_expiration_date)
    last_activity = models.DateTimeField(auto_now=True)


class Requestor(models.Model):
    requestor_id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    requestor_email = models.EmailField(unique=True)
    otp = models.CharField(max_length=6)
    otp_expiry = models.DateTimeField(null=True, blank=True)
    is_verified = models.BooleanField(default=False)


class Negotiation(models.Model):
    STATE_CHOICES = [
        ('requestor_open', 'Requestor Open'),
        ('owner_open', 'Owner Open'),
        ('completed', 'Completed'),
        ('archived', 'Archived'),
        ('canceled', 'Canceled'),
        ('rejected', 'Rejected'),
    ]

    negotiation_id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False)
    conversation_id = models.UUIDField(default=uuid.uuid4, editable=False)
    requestor_responses = models.JSONField(null=True, blank=True)
    owner_responses = models.JSONField(null=True, blank=True)
    comments = models.JSONField(null=True, blank=True)
    state = models.CharField(
        max_length=50, choices=STATE_CHOICES, default='requestor_open')
    reminder_sent = models.BooleanField(default=False)
    questionnaire_SAID = models.CharField(max_length=255)
    timestamps = models.DateTimeField(auto_now_add=True)
    archived = models.BooleanField(default=False)


class Archive(models.Model):
    negotiation = models.OneToOneField(Negotiation, on_delete=models.CASCADE)
    archived_timestamp = models.DateTimeField(auto_now_add=True)
    archived_data = models.JSONField()
    questionnaire_SAID = models.CharField(
        max_length=255, null=True, blank=True)

    def __str__(self):
        return f"Archived Negotiation: {self.negotiation}"


class SummaryStatistic(models.Model):
    owner_id = models.ForeignKey(
        NLink,
        on_delete=models.CASCADE,
        db_column="owner_id",       # ← tie to the existing column
        null=False,                 # ← enforce NOT NULL
        related_name="summary_statistics",
    )
    summary_date = models.DateTimeField(auto_now_add=True)
    datasets_requested = models.JSONField()
    overall_stat = models.JSONField()

    def __str__(self):
        return f"Statistics for Owner: {self.owner_id} on {self.summary_date}"
