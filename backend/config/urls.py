"""
URL configuration for config project.
"""
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')),
    path('', include('core.urls')),  # Fallback for requests missing /api prefix
]
