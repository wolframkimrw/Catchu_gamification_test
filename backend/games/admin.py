from django.contrib import admin

# Register your models here.
# backend/games/admin.py
from django.contrib import admin
from .models import (
    Game,
    GameItem,
    GameChoiceLog,
    WorldcupPickLog,
    GameResult,
    Banner,
    BannerClickLog,
)

admin.site.register(Game)
admin.site.register(GameItem)
admin.site.register(GameChoiceLog)
admin.site.register(WorldcupPickLog)
admin.site.register(GameResult)
admin.site.register(Banner)
admin.site.register(BannerClickLog)
