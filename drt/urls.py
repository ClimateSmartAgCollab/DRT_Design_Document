from django.urls import path
from . import views




urlpatterns = [
    path('generate_nlinks/<str:link_id>/', views.generate_nlinks, name='generate_nlinks'),
    path('verify/requestor/<str:link_id>/', views.requestor_email_entry, name='requestor_email_entry'),
    path('verify/otp/<str:link_id>/', views.verify_otp, name='verify_otp'),
    path('request_access/<uuid:link_id>/', views.request_access, name='request_access'),
    path('fill_questionnaire/<uuid:uuid>/', views.fill_questionnaire, name='fill_questionnaire'),
    path('owner_review/<uuid:uuid>/', views.owner_review, name='owner_review'),
    
    path('negotiations/', views.negotiation_list, name='negotiation_list'),  # Display all negotiations
    path('negotiations/archive/<uuid:negotiation_id>/', views.archive_view, name='archive_negotiation'),  # Archive a negotiation
    path('negotiations/delete/<uuid:negotiation_id>/', views.delete_negotiation_files, name='delete_negotiation_files'),  # Delete negotiation files
    path('negotiations/delete-old/', views.delete_old_negotiations_view, name='delete_old_negotiations'), 
    path('summary-statistics/<str:owner_id>/', views.summary_statistics_view, name='summary_statistics'),

    path('api/submission/<uuid:uuid>', views.submission_view, name='submission'),
]
