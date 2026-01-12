from rest_framework import serializers
from .models import Game, GameItem, WorldcupTopic

class TopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorldcupTopic
        fields = ("id", "name")
        
class GameItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = GameItem
        fields = ("id", "name", "file_name", "sort_order")
        
class GameListSerializer(serializers.ModelSerializer):
    topic = TopicSerializer(source="parent_topic", read_only=True)
    
    class Meta:
        model = Game
        fields = ("id", "title", "type", "thumbnail_image_url", "topic")

class GameDetailSerializer(serializers.ModelSerializer):
    topic = TopicSerializer(source="parent_topic", read_only=True)
    items = GameItemSerializer(many=True, read_only=True)

    class Meta:
        model = Game
        fields = ("id", "title", "type", "thumbnail_image_url", "topic", "items")