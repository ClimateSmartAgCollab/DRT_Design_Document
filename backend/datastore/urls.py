from django.urls import path
from . import views

#URLConf
urlpatterns = [
    path('load-data/', views.load_github_data, name='load_github_data'),
    path('cached-data/<str:key>/', views.get_cached_data, name='get_cached_data'),
    path('questionnaire/<str:questionnaire_id>/', views.get_questionnaire_json, name='get_questionnaire_json'),
    path('license/<str:license_id>/', views.get_license_template, name='get_license_template'),
    path('license-table/', views.get_license_table, name='get_license_table'),
    path('webhook/', views.github_webhook, name='github_webhook'),
]
