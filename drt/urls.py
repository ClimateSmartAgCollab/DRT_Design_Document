from django.urls import path
from . import views

urlpatterns = [
    path('request-access/', views.request_access, name='request_access'),
    path('fill-questionnaire/<uuid:uuid>/', views.fill_questionnaire, name='fill_questionnaire'),
]
