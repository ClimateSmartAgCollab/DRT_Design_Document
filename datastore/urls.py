from django.urls import path
from . import views

#URLConf
urlpatterns = [
    path('load-data/', views.load_github_data, name='load_github_data'),
    path('webhook/', views.github_webhook, name='github_webhook'),
]
