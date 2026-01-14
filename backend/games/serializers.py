from rest_framework import serializers

from .models import (
    Game,
    GameChoiceLog,
    GameItem,
    GameResult,
    GameEditRequest,
    WorldcupPickLog,
    WorldcupTopic,
)


class GameListSerializer(serializers.ModelSerializer):
    topic = serializers.SerializerMethodField()
    thumbnail_image_url = serializers.CharField()

    class Meta:
        model = Game
        fields = ["id", "title", "slug", "type", "topic", "thumbnail_image_url"]

    def get_topic(self, obj):
        if obj.parent_topic:
            return {"id": obj.parent_topic.id, "name": obj.parent_topic.name}
        return None


class GameDetailSerializer(serializers.ModelSerializer):
    topic = serializers.SerializerMethodField()
    items = serializers.SerializerMethodField()
    thumbnail_image_url = serializers.CharField()

    class Meta:
        model = Game
        fields = [
            "id",
            "title",
            "description",
            "slug",
            "type",
            "topic",
            "thumbnail_image_url",
            "items",
        ]

    def get_topic(self, obj):
        if obj.parent_topic:
            return {"id": obj.parent_topic.id, "name": obj.parent_topic.name}
        return None

    def get_items(self, obj):
        items = obj.items.filter(is_active=True)
        return GameItemSerializer(items, many=True).data


class GameItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = GameItem
        fields = ["id", "name", "file_name", "sort_order"]


class WorldcupTopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorldcupTopic
        fields = ["id", "name"]


class WorldcupTopicCreateSerializer(serializers.Serializer):
    name = serializers.CharField()

    def validate_name(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("주제명을 입력해 주세요.")
        return cleaned


class GameAdminListSerializer(serializers.ModelSerializer):
    created_by = serializers.SerializerMethodField()
    thumbnail_image_url = serializers.CharField()

    class Meta:
        model = Game
        fields = [
            "id",
            "title",
            "type",
            "status",
            "visibility",
            "thumbnail_image_url",
            "created_at",
            "created_by",
        ]

    def get_created_by(self, obj):
        user = obj.created_by
        if not user:
            return None
        return {"id": user.id, "name": user.name, "email": user.email}


class AdminGameItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = GameItem
        fields = ["id", "name", "file_name", "sort_order", "is_active"]


class AdminGameDetailSerializer(serializers.ModelSerializer):
    topic = serializers.SerializerMethodField()
    items = serializers.SerializerMethodField()
    thumbnail_image_url = serializers.CharField()
    created_by = serializers.SerializerMethodField()

    class Meta:
        model = Game
        fields = [
            "id",
            "title",
            "description",
            "slug",
            "type",
            "status",
            "visibility",
            "topic",
            "thumbnail_image_url",
            "items",
            "created_by",
        ]

    def get_topic(self, obj):
        if obj.parent_topic:
            return {"id": obj.parent_topic.id, "name": obj.parent_topic.name}
        return None

    def get_items(self, obj):
        items = obj.items.all().order_by("sort_order", "id")
        return AdminGameItemSerializer(items, many=True).data

    def get_created_by(self, obj):
        user = obj.created_by
        if not user:
            return None
        return {"id": user.id, "name": user.name, "email": user.email}


class AdminWorldcupTopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorldcupTopic
        fields = ["id", "name", "slug", "sort_order", "is_active"]


class AdminGameChoiceLogSerializer(serializers.ModelSerializer):
    game = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()

    class Meta:
        model = GameChoiceLog
        fields = ["id", "game", "user", "source", "ip_address", "started_at"]

    def get_game(self, obj):
        return {"id": obj.game_id, "title": obj.game.title}

    def get_user(self, obj):
        if not obj.user:
            return None
        return {"id": obj.user.id, "name": obj.user.name, "email": obj.user.email}


class AdminWorldcupPickLogSerializer(serializers.ModelSerializer):
    game = serializers.SerializerMethodField()
    choice_id = serializers.IntegerField()
    selected_item = serializers.SerializerMethodField()

    class Meta:
        model = WorldcupPickLog
        fields = ["id", "choice_id", "game", "selected_item", "step_index", "created_at"]

    def get_game(self, obj):
        return {"id": obj.game_id, "title": obj.game.title}

    def get_selected_item(self, obj):
        if not obj.selected_item:
            return None
        return {"id": obj.selected_item.id, "name": obj.selected_item.name}


class AdminGameResultSerializer(serializers.ModelSerializer):
    game = serializers.SerializerMethodField()
    choice_id = serializers.IntegerField()
    winner_item = serializers.SerializerMethodField()

    class Meta:
        model = GameResult
        fields = ["id", "choice_id", "game", "winner_item", "result_title", "created_at"]

    def get_game(self, obj):
        return {"id": obj.game_id, "title": obj.game.title}

    def get_winner_item(self, obj):
        if not obj.winner_item:
            return None
        return {"id": obj.winner_item.id, "name": obj.winner_item.name}


class AdminGameEditRequestSerializer(serializers.ModelSerializer):
    game = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()

    class Meta:
        model = GameEditRequest
        fields = ["id", "game", "user", "status", "created_at", "updated_at", "payload"]

    def get_game(self, obj):
        return {"id": obj.game_id, "title": obj.game.title}

    def get_user(self, obj):
        return {"id": obj.user_id, "name": obj.user.name, "email": obj.user.email}


class GameChoiceLogCreateSerializer(serializers.Serializer):
    game_id = serializers.IntegerField()
    source = serializers.CharField(required=False, allow_blank=True)

    def validate_game_id(self, value):
        if value <= 0:
            raise serializers.ValidationError("게임 ID가 올바르지 않습니다.")
        return value


class WorldcupPickLogCreateSerializer(serializers.Serializer):
    choice_id = serializers.IntegerField()
    game_id = serializers.IntegerField()
    left_item_id = serializers.IntegerField(required=False, allow_null=True)
    right_item_id = serializers.IntegerField(required=False, allow_null=True)
    selected_item_id = serializers.IntegerField(required=False, allow_null=True)
    step_index = serializers.IntegerField(min_value=0)

    def validate(self, attrs):
        session = GameChoiceLog.objects.filter(id=attrs["choice_id"]).first()
        if not session:
            raise serializers.ValidationError({"choice_id": "선택 로그를 찾을 수 없습니다."})
        game = Game.objects.filter(id=attrs["game_id"]).first()
        if not game:
            raise serializers.ValidationError({"game_id": "게임을 찾을 수 없습니다."})
        if session.game_id != game.id:
            raise serializers.ValidationError("세션과 게임이 일치하지 않습니다.")

        def _resolve_item(field_name: str):
            item_id = attrs.get(field_name)
            if item_id is None:
                return None
            item = GameItem.objects.filter(id=item_id, game_id=game.id).first()
            if not item:
                raise serializers.ValidationError({field_name: "게임 아이템을 찾을 수 없습니다."})
            return item

        left_item = _resolve_item("left_item_id")
        right_item = _resolve_item("right_item_id")
        selected_item = _resolve_item("selected_item_id")
        if selected_item and left_item and right_item:
            if selected_item.id not in (left_item.id, right_item.id):
                raise serializers.ValidationError(
                    {"selected_item_id": "선택된 아이템이 좌/우 아이템에 포함되지 않습니다."}
                )

        attrs["choice"] = session
        attrs["game"] = game
        attrs["left_item"] = left_item
        attrs["right_item"] = right_item
        attrs["selected_item"] = selected_item
        return attrs


class GameResultCreateSerializer(serializers.Serializer):
    choice_id = serializers.IntegerField()
    game_id = serializers.IntegerField()
    winner_item_id = serializers.IntegerField(required=False, allow_null=True)
    result_title = serializers.CharField()
    result_code = serializers.CharField(required=False, allow_blank=True)
    result_image_url = serializers.URLField(required=False, allow_blank=True)
    share_url = serializers.URLField(required=False, allow_blank=True)
    result_payload = serializers.JSONField(required=False, allow_null=True)

    def validate(self, attrs):
        choice = GameChoiceLog.objects.filter(id=attrs["choice_id"]).first()
        if not choice:
            raise serializers.ValidationError({"choice_id": "선택 로그를 찾을 수 없습니다."})
        game = Game.objects.filter(id=attrs["game_id"]).first()
        if not game:
            raise serializers.ValidationError({"game_id": "게임을 찾을 수 없습니다."})
        if choice.game_id != game.id:
            raise serializers.ValidationError("세션과 게임이 일치하지 않습니다.")
        if GameResult.objects.filter(choice_id=choice.id).exists():
            raise serializers.ValidationError({"choice_id": "이미 결과가 등록된 선택 로그입니다."})

        winner_item = None
        winner_item_id = attrs.get("winner_item_id")
        if winner_item_id is not None:
            winner_item = GameItem.objects.filter(
                id=winner_item_id, game_id=game.id
            ).first()
            if not winner_item:
                raise serializers.ValidationError(
                    {"winner_item_id": "게임 아이템을 찾을 수 없습니다."}
                )

        attrs["choice"] = choice
        attrs["game"] = game
        attrs["winner_item"] = winner_item
        return attrs
