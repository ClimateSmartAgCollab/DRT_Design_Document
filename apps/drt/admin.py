from django.contrib import admin
from .models import (
    Owner, Requestor, NLink, Negotiation, Archive, 
    SummaryStatistics, Questionnaire
)

@admin.register(Owner)
class OwnerAdmin(admin.ModelAdmin):
    list_display = ['owner_id', 'email']
    search_fields = ['email']

@admin.register(Requestor)
class RequestorAdmin(admin.ModelAdmin):
    list_display = ['requestor_id', 'requestor_email', 'otp_expiray', 'is_verified']
    search_fields = ['requestor_email']
    list_filter = ['otp_expiray', 'is_verified']

@admin.register(Questionnaire)
class QuestionnaireAdmin(admin.ModelAdmin):
    list_display = ['questionnaire_id', 'owner', 'is_submitted']
    search_fields = ['questionnaire_id', 'owner__email']
    list_filter = ['is_submitted']

@admin.register(NLink)
class NLinkAdmin(admin.ModelAdmin):
    list_display = [
        'link_id', 'negotiation_id', 'owner_id', 'requestor_id', 
        'questionnaire_SAID', 'expiration_date', 'last_activity'
    ]
    search_fields = ['owner_id__email', 'requestor_id__requestor_email']
    list_filter = ['expiration_date', 'last_activity']

@admin.register(Negotiation)
class NegotiationAdmin(admin.ModelAdmin):
    list_display = ['negotiation_id', 'negotiation_status', 'questionnaire_SAID', 'timestamps']
    list_filter = ['negotiation_status', 'timestamps']
    search_fields = ['questionnaire_SAID__questionnaire_id']

@admin.register(Archive)
class ArchiveAdmin(admin.ModelAdmin):
    list_display = ['negotiation_id', 'archived_timestamp']
    search_fields = ['negotiation_id__negotiation_status']

@admin.register(SummaryStatistics)
class SummaryStatisticsAdmin(admin.ModelAdmin):
    list_display = ['owner_id', 'summary_date']
    search_fields = ['owner_id__email']
    list_filter = ['summary_date']
