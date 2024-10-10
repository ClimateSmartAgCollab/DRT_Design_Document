from django.contrib import admin
from .models import Owner, Requestor, NLink, Negotiation, Archive, SummaryStatistics, Questionnaire


@admin.register(Owner)
class OwnerAdmin(admin.ModelAdmin):
    list_display = ['owner_id', 'email']
    search_fields = ['email']

@admin.register(Requestor)
class RequestorAdmin(admin.ModelAdmin):
    list_display = ['requestor_id', 'email', 'is_verified']  # Display fields that exist in Requestor model
    search_fields = ['email']
    list_filter = ['is_verified']

@admin.register(NLink)
class NLinkAdmin(admin.ModelAdmin):
    list_display = ['link_id', 'owner', 'requestor', 'created_at', 'expired']
    list_filter = ['expired', 'created_at']
    search_fields = ['owner__name', 'requestor__email']

@admin.register(Negotiation)
class NegotiationAdmin(admin.ModelAdmin):
    list_display = ['negotiation_id', 'nlink', 'state', 'feedback']
    list_filter = ['state']
    search_fields = ['nlink__owner__name', 'nlink__requestor__email']

@admin.register(Archive)
class ArchiveAdmin(admin.ModelAdmin):
    list_display = ['negotiation', 'archived_at']
    search_fields = ['negotiation__nlink__owner__name']

@admin.register(SummaryStatistics)
class SummaryStatisticsAdmin(admin.ModelAdmin):
    list_display = ['owner', 'request_count', 'average_response_time', 'last_updated']
    search_fields = ['owner__name']
    list_filter = ['last_updated']

@admin.register(Questionnaire)
class QuestionnaireAdmin(admin.ModelAdmin):
    list_display = ['questionnaire_id', 'owner']  # This works as Questionnaire model has owner as a ForeignKey
    search_fields = ['questionnaire_id', 'owner__email']