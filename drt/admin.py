from django.contrib import admin
from .models import Requestor, NLink, Negotiation, Archive, SummaryStatistics

@admin.register(Requestor)
class RequestorAdmin(admin.ModelAdmin):
    list_display = ('requestor_email', 'is_verified', 'otp_expiry')
    search_fields = ('requestor_email',)
    list_filter = ('is_verified',)

@admin.register(NLink)
class NLinkAdmin(admin.ModelAdmin):
    list_display = ('link_id', 'owner_id', 'license_id', 'expiration_date', 'last_activity')
    search_fields = ('owner_id', 'license_id', 'requestor_email')
    list_filter = ('expiration_date',)

@admin.register(Negotiation)
class NegotiationAdmin(admin.ModelAdmin):
    list_display = ('negotiation_id', 'state', 'timestamps', 'archived')
    search_fields = ('negotiation_id', 'state')
    list_filter = ('state', 'archived', 'timestamps')
    readonly_fields = ('negotiation_id', 'conversation_id')  # Prevent editing UUIDs

@admin.register(Archive)
class ArchiveAdmin(admin.ModelAdmin):
    list_display = ('negotiation', 'archived_timestamp')
    search_fields = ('negotiation__negotiation_id',)
    list_filter = ('archived_timestamp',)
    
@admin.register(SummaryStatistics)
class SummaryStatisticsAdmin(admin.ModelAdmin):
    list_display = ('owner_id', 'summary_date')
    search_fields = ('owner_id__owner_id', 'summary_date')
    list_filter = ('summary_date',)

