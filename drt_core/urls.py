import debug_toolbar
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('__debug__/', include(debug_toolbar.urls)),
    path('admin/', admin.site.urls),
    path('datastore/', include('datastore.urls')),
    path('drt/', include('drt.urls')),  
]
