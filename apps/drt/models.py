from django.db import models
import uuid
# from uuid6 import uuid7
from datetime import datetime, timedelta


class Owner(models.Model):
    owner_id = models.CharField(max_length=255, primary_key=True)  
    email = models.EmailField()


class Requestor(models.Model):
    # requestor_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    requestor_email = models.EmailField(unique=True)
    otp = models.CharField(max_length=6)
    otp_expiray = models.CharField(default=False)
    is_verified = models.BooleanField(default=False)

# Questionnaire model for storing questionnaire data
class Questionnaire(models.Model):
    questionnaire_id = models.CharField(max_length=255, primary_key=True)  # Based on 'questionnaire_SAID'
    owner = models.ForeignKey(Owner, on_delete=models.CASCADE)
    schema = models.JSONField()  # Stores the questionnaire structure in JSON
    is_submitted = models.BooleanField(default=False)  # Track submission status
    saved_data = models.JSONField(blank=True, null=True)  # For saved requestor dat


class NLink(models.Model):
    # link_id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    link_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    negotiation_id = models.ForeignKey('Negotiation', on_delete=models.CASCADE)
    owner_id = models.ForeignKey(Owner, on_delete=models.CASCADE)
    requestor_id = models.ForeignKey(Requestor, on_delete=models.CASCADE)
    questionnaire_SAID = models.ForeignKey(Questionnaire, on_delete=models.CASCADE)
    # state = models.CharField(max_length=50) # requestor_open, owner_open, completed, etc.
    expiration_date = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now_add=True)
    # dataset_label =  models.ForeignKey(Link, on_delete=models.CASCADE) #from the link table in DS


class Negotiation(models.Model):
    negotiation_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    requestor_responses = models.JSONField() 
    owner_responses = models.JSONField() 
    # nlink = models.ForeignKey(NLink, on_delete=models.CASCADE)
    negotiation_status = models.CharField(max_length=50)  # open, completed, archived.
    questionnaire_SAID = models.ForeignKey(Questionnaire, on_delete=models.CASCADE)
    timestamps = models.DateTimeField(auto_now_add=True)
    # feedback = models.TextField(blank=True, null=True)


class Archive(models.Model):
    # id = models.BigAutoField(primary_key=True)  # Explicit BigAutoField for primary key
    negotiation_id = models.ForeignKey(Negotiation, on_delete=models.CASCADE)
    archived_timestamp = models.DateTimeField(auto_now_add=True)
    archived_data = models.JSONField() 


class SummaryStatistics(models.Model):
    # id = models.BigAutoField(primary_key=True)  # Explicit BigAutoField for primary key
    owner_id = models.ForeignKey(Owner, on_delete=models.CASCADE)
    summary_date = models.DateTimeField(auto_now_add=True)
    datasets_requested = models.JSONField() 
    overall_stat = models.JSONField() 
    # request_count = models.IntegerField(default=0)
    # average_response_time = models.FloatField(default=0.0)
    # last_updated = models.DateTimeField(auto_now=True)
