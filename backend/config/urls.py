from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include

from . import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/ping', views.PingView.as_view(), name='system.ping'),
    path('api/test-error', views.TestErrorView.as_view(), name='system.test_error'),
    
    path('api/games/', include('games.urls', namespace='games')),
    path('api/accounts/', include('accounts.urls', namespace='accounts')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
