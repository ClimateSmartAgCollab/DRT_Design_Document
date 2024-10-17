from django.urls import path
from . import views

#URLConf
urlpatterns = [
    path('load-data/', views.load_github_data, name='load_github_data'),
    path('webhook/', views.github_webhook, name='github_webhook'),
    path('get_cached_data/<str:key>/', views.get_cached_data, name='get_cached_data'),
]
