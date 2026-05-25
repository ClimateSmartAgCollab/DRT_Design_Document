from django.urls import path
from .views import (generate_nlinks, requestor_email_entry, verify_magic_link_view, request_access,
                    fill_questionnaire, preview_questionnaire, verify_req_magic_link, negotiation_list_api_req,
                    owner_email_entry, verify_owner_magic_link, owner_review, archive_view,
                    export_summary_to_drt_view, negotiation_list_api, delete_negotiation_files,
                    delete_old_negotiations_view, summary_statistics_view, submission_view,
                    req_email_entry, owner_links_api, whoami, req_whoami, test_endpoint,
                    regenerate_license_view, negotiation_history_view, negotiation_history_view_req,
                    requestor_logout, owner_logout,
                    reopen_negotiation_view, process_abandonment_policy_view, abandon_negotiation_view
                    )
from .views.admin import (
    admin_email_entry, verify_admin_magic_link, admin_whoami, admin_logout,
    admin_dashboard_stats, admin_health_check
)

urlpatterns = [
    # Test endpoint
    path('test/',
         test_endpoint,
         name='test_endpoint'),

    # requestor
    path('generate_nlinks/<str:link_id>/',
         generate_nlinks,
         name='generate_nlinks'),

    path('verify/requestor/<str:link_id>/',
         requestor_email_entry,
         name='requestor_email_entry'),

    #     path('verify/requestor-email/',
    #          requestor_email_entry,
    #          name='requestor_email_entry'),

    path('verify/magic-link/<str:link_id>/',
         verify_magic_link_view,
         name='verify_magic_link'),

    path('verify/req-email/',
         req_email_entry,
         name='req_email_entry'),

    path('auth/verify-req-magic-link/',
         verify_req_magic_link,
         name='verify_req_magic_link'),

    path("requestor/whoami/",
         req_whoami,
         name="req-whoami"),

    path("requestor/logout/",
         requestor_logout,
         name="requestor-logout"),

    path('request_access/<str:link_id>/',
         request_access,
         name='request_access'),

    path('fill_questionnaire/<str:link_id>/',
         fill_questionnaire,
         name='fill_questionnaire'),

    # Preview endpoint (no authentication required)
    path('preview-questionnaire/',
         preview_questionnaire,
         name='preview_questionnaire'),

    path('req_negotiations/',
         negotiation_list_api_req,
         name='negotiation_list_api_req'
         ),

    path('req_negotiations/<uuid:negotiation_id>/history/',
         negotiation_history_view_req,
         name='req_negotiation_history'),  # Requestor-side negotiation history

    # owner
    path('verify/owner-email/',
         owner_email_entry,
         name='owner_email_entry'),

    path('auth/verify-owner-magic-link/',
         verify_owner_magic_link,
         name='verify_owner_magic_link'),

    path("owner/whoami/",
         whoami,
         name="owner-whoami"),

    path("owner/logout/",
         owner_logout,
         name="owner-logout"),

    # admin
    path('admin/send-magic-link/',
         admin_email_entry,
         name='admin_email_entry'),

    path('admin/verify-magic-link/',
         verify_admin_magic_link,
         name='verify_admin_magic_link'),

    path("admin/whoami/",
         admin_whoami,
         name="admin-whoami"),

    path("admin/logout/",
         admin_logout,
         name="admin-logout"),

    path("admin/dashboard/stats/",
         admin_dashboard_stats,
         name="admin-dashboard-stats"),

    path("admin/health/",
         admin_health_check,
         name="admin-health-check"),

    path('owner_review/<str:link_id>/',
         owner_review,
         name='owner_review'),

    path('negotiations/archive/<uuid:negotiation_id>/',
         archive_view,
         name='archive_negotiation'),  # Archive a negotiation

    path('negotiations/delete/<uuid:negotiation_id>/',
         delete_negotiation_files,
         name='delete_negotiation_files'),  # Delete negotiation files

    path('negotiations/regenerate-license/<uuid:negotiation_id>/',
         regenerate_license_view,
         name='regenerate_license'),  # Regenerate license for a negotiation

    path('negotiations/reopen/<uuid:negotiation_id>/',
         reopen_negotiation_view,
         name='reopen_negotiation'),  # Reopen a negotiation

    path('negotiations/abandon/<uuid:negotiation_id>/',
         abandon_negotiation_view,
         name='abandon_negotiation'),  # Abandon a negotiation (requestor)

    path('negotiations/<uuid:negotiation_id>/history/',
         negotiation_history_view,
         name='negotiation_history'),  # Get negotiation history

    path('negotiations/delete-old/',
         delete_old_negotiations_view,
         name='delete_old_negotiations'),

    path('negotiations/process-abandonment-policy/',
         process_abandonment_policy_view,
         name='process_abandonment_policy'),  # Process abandonment policy

    path('negotiations/',
         negotiation_list_api,
         name='negotiation_list_api'),  # Display all negotiations

    #     path('owner-negotiations/',
    #          views.owner_negotiation_list,
    #          name='owner_negotiation_list'),

    #     path('negotiations/<uuid:negotiation_id>/resend/',
    #          views.resend_requester_reminder,
    #          name='resend_requester_reminder'),

    path('summary-statistics/',
         summary_statistics_view,
         name='summary_statistics'),
    path('export_summary_to_drt/',
         export_summary_to_drt_view,
         name='export_summary_to_drt_view'),

    path("owner/links/", owner_links_api, name="owner_links_api"),

    path('api/submission/<uuid:uuid>', submission_view, name='submission'),
]
