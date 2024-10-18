from django.urls import path
from . import views

urlpatterns = [
    path('request-access/', views.request_access, name='request_access'),
    path('fill-questionnaire/<uuid:uuid>/', views.fill_questionnaire, name='fill_questionnaire'),

    path('generate_nlinks/<str:link_id>/', views.generate_nlinks, name='generate_nlinks'),
    path('verify/requestor/<str:link_id>/', views.requestor_email_entry, name='requestor_email_entry'),
    path('verify/otp/<str:link_id>/', views.verify_otp, name='verify_otp'),
]
