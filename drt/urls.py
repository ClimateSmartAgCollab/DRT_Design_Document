from django.urls import path
from .views import (generate_nlinks, requestor_email_entry, verify_otp, request_access,
                    fill_questionnaire, verify_req_otp, negotiation_list_api_req,
                    owner_email_entry, verify_owner_otp, owner_review, archive_view,
                    export_summary_to_drt_view, negotiation_list_api, delete_negotiation_files,
                    delete_old_negotiations_view, summary_statistics_view, submission_view,
                    req_email_entry, owner_links_api,whoami, req_whoami
                    )

urlpatterns = [
    # requestor
    path('generate_nlinks/<str:link_id>/',
         generate_nlinks, name='generate_nlinks'),
    path('verify/requestor/<str:link_id>/',
         requestor_email_entry, name='requestor_email_entry'),
    path('verify/otp/<str:link_id>/', verify_otp, name='verify_otp'),
     path("requestor/whoami/",
          req_whoami,
          name="req-whoami"),    
    path('request_access/<str:link_id>/',
         request_access, name='request_access'),
    path('fill_questionnaire/<str:link_id>/',
         fill_questionnaire, name='fill_questionnaire'),
    path('verify/req-email/',
         req_email_entry,   name='req_email_entry'),
    path('verify/req-otp/<str:email>/',
         verify_req_otp,     name='verify_owner_otp'),
    path('req_negotiations/',
        negotiation_list_api_req,   name='negotiation_list_api_req'
    ),

    # owner
    path('verify/owner-email/',
         owner_email_entry,
         name='owner_email_entry'),

    path('verify/owner-otp/<str:email>/',
         verify_owner_otp,
         name='verify_owner_otp'),

     path("owner/whoami/",
          whoami,
          name="owner-whoami"),

    path('owner_review/<str:link_id>/',
         owner_review,
         name='owner_review'),

    path('negotiations/archive/<uuid:negotiation_id>/',
         archive_view,
         name='archive_negotiation'),  # Archive a negotiation

    path('negotiations/delete/<uuid:negotiation_id>/',
         delete_negotiation_files,
         name='delete_negotiation_files'),  # Delete negotiation files

    path('negotiations/delete-old/',
         delete_old_negotiations_view,
         name='delete_old_negotiations'),

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
