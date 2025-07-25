from django.urls import path
from . import views

#URLConf
urlpatterns = [
    path('load-data/', views.load_github_data, name='load_github_data'),
    path('cached-data/<str:key>/', views.get_cached_data, name='get_cached_data'),
    path('questionnaire/<str:questionnaire_id>/', views.get_questionnaire_json, name='get_questionnaire_json'),
    path('webhook/', views.github_webhook, name='github_webhook'),
]
