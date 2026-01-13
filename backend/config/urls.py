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
