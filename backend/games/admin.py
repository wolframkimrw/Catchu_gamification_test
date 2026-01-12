from django.contrib import admin

# Register your models here.
# backend/games/admin.py
from django.contrib import admin
from .models import (
    WorldcupTopic,
    Game,
    GameItem,
    GameSession,
    GameChoiceLog,
    GameResult,
    Banner,
    BannerClickLog,
)

admin.site.register(WorldcupTopic)
admin.site.register(Game)
admin.site.register(GameItem)
admin.site.register(GameSession)
admin.site.register(GameChoiceLog)
admin.site.register(GameResult)
admin.site.register(Banner)
admin.site.register(BannerClickLog)
