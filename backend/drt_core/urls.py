import debug_toolbar
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('__debug__/', include(debug_toolbar.urls)),
    # Changed from 'admin/' to 'django-admin/' to avoid conflict with Next.js admin routes
    # Next.js admin routes (/admin/email-entry, /admin/homepage, etc.) should be handled by frontend
    path('django-admin/', admin.site.urls),
    path('datastore/', include('datastore.urls')),
    path('drt/', include('drt.urls')),  
]
