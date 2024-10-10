from django.urls import path
from .views import verify_email, fill_questionnaire

urlpatterns = [
    path('verify-email/<uuid:requestor_id>/', verify_email, name='verify_email'),
    path('fill-questionnaire/<uuid:link_id>/', fill_questionnaire, name='fill_questionnaire'),
]
