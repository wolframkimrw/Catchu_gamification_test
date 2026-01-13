from django.utils import timezone
from config.views import BaseAPIView
from .models import Game, GameChoiceLog, GameResult, WorldcupPickLog
from .serializers import (
    GameListSerializer,
    GameDetailSerializer,
    GameChoiceLogCreateSerializer,
    GameResultCreateSerializer,
    WorldcupPickLogCreateSerializer,
)
from django.shortcuts import get_object_or_404
import uuid

# Create your views here.

class GameListView(BaseAPIView):
    api_name = "games.list"
    
    def get(self, request, *args, **kwargs):
        qs = Game.objects.filter(status="ACTIVE")
        serializer = GameListSerializer(qs, many=True)
        return self.respond(data={"games": serializer.data})
        
class GameDetailView(BaseAPIView):
    api_name = "games.detail"
    
    def get(self, request, game_id: int, *args, **kwargs):
        game = get_object_or_404(Game, pk=game_id)
        serializer = GameDetailSerializer(game)
        return self.respond(data={"game": serializer.data})


class GameChoiceLogCreateView(BaseAPIView):
    api_name = "games.session.create"

    def post(self, request, *args, **kwargs):
        serializer = GameChoiceLogCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        game = get_object_or_404(Game, pk=data["game_id"])
        session = GameChoiceLog.objects.create(
            game=game,
            user=request.user if request.user.is_authenticated else None,
            session_token=uuid.uuid4().hex,
            source=data.get("source", ""),
            referer_url=request.META.get("HTTP_REFERER", ""),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            ip_address=request.META.get("REMOTE_ADDR", ""),
        )
        return self.respond(
            data={"session_id": session.id},
        )


class WorldcupPickLogCreateView(BaseAPIView):
    api_name = "games.worldcup.pick.create"

    def post(self, request, *args, **kwargs):
        serializer = WorldcupPickLogCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        pick = WorldcupPickLog.objects.create(
            session=data["session"],
            game=data["game"],
            left_item=data.get("left_item"),
            right_item=data.get("right_item"),
            selected_item=data.get("selected_item"),
            step_index=data["step_index"],
        )
        return self.respond(data={"pick_id": pick.id})


class GameResultCreateView(BaseAPIView):
    api_name = "games.result.create"

    def post(self, request, *args, **kwargs):
        serializer = GameResultCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        result = GameResult.objects.create(
            session=data["session"],
            game=data["game"],
            winner_item=data.get("winner_item"),
            result_title=data["result_title"],
            result_code=data.get("result_code", ""),
            result_image_url=data.get("result_image_url", ""),
            share_url=data.get("share_url", ""),
            result_payload=data.get("result_payload"),
        )
        if not result.session.finished_at:
            result.session.finished_at = timezone.now()
            result.session.save(update_fields=["finished_at"])
        return self.respond(data={"result_id": result.id})
