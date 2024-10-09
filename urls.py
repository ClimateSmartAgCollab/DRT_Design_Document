from django.contrib import admin
from django.urls import path, include
# from rest_framework_simplejwt.views import (
#     TokenObtainPairView,
#     TokenRefreshView,
# )
# from drf_spectacular.views import (
#     SpectacularAPIView,
#     SpectacularRedocView,
#     SpectacularSwaggerView,
# )

urlpatterns = [
    # Django paths
    path("admin/", admin.site.urls),
    # path('git/', include('gitSetupApp.urls')),
    path('negotiations/', include('negotiations.urls')),
    # JWT
    # path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    # path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # # OpenAPI DRF Spectacular
    # path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    # path(
    #     "api/schema/swagger-ui/",
    #     SpectacularSwaggerView.as_view(url_name="schema"),
    #     name="swagger-ui",
    # ),
    # path(
    #     "api/schema/redoc/",
    #     SpectacularRedocView.as_view(url_name="schema"),
    #     name="redoc",
    # ),
]
