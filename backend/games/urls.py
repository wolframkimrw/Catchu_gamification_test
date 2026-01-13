from django.urls import path
from .views import (
    GameListView,
    GameDetailView,
    GameChoiceLogCreateView,
    GameResultCreateView,
    WorldcupPickLogCreateView,
)

app_name = 'games'

urlpatterns = [
    path("", GameListView.as_view(), name="list"),
    path("<int:game_id>/", GameDetailView.as_view(), name="detail"),
    path("session/", GameChoiceLogCreateView.as_view(), name="session_create"),
    path("worldcup/pick/", WorldcupPickLogCreateView.as_view(), name="worldcup_pick_create"),
    path("result/", GameResultCreateView.as_view(), name="result_create"),
]
