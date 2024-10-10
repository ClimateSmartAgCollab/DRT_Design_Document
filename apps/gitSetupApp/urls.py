from django.urls import path
from . import views

urlpatterns = [
    # URL to load GitHub data into the DRT cache and database
    path('load-data/', views.load_github_data, name='load_github_data'),

    # URL to handle GitHub webhook events (like pushes or updates)
    path('webhook/', views.github_webhook, name='github_webhook'),
]
