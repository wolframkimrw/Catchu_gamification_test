from django.shortcuts import render
from config.views import BaseAPIView
from .models import Game
from .serializers import GameListSerializer, GameDetailSerializer
from django.shortcuts import get_object_or_404

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