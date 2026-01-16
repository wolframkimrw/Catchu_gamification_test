from django.db import migrations
from django.utils import timezone


def seed_major_arcana(apps, schema_editor):
    Game = apps.get_model("games", "Game")
    TodayPick = apps.get_model("games", "TodayPick")

    slug = "major-arcana"
    defaults = {
        "title": "🔮 타로 성향 테스트",
        "description": "선택지에 따라 카드 성향 결과가 달라지는 심리테스트입니다.",
        "type": "PSYCHOLOGICAL",
        "status": "ACTIVE",
        "visibility": "PUBLIC",
        "thumbnail_image_url": "",
        "storage_prefix": "psycho/major-arcana/",
        "is_official": True,
    }

    game, _ = Game.objects.get_or_create(slug=slug, defaults=defaults)
    for field, value in defaults.items():
        if getattr(game, field) != value:
            setattr(game, field, value)
    game.save()

    TodayPick.objects.filter(is_active=True).update(is_active=False)
    TodayPick.objects.create(
        game=game,
        picked_date=timezone.localdate(),
        is_active=True,
        created_by=None,
    )


def reverse_seed(apps, schema_editor):
    TodayPick = apps.get_model("games", "TodayPick")
    Game = apps.get_model("games", "Game")
    TodayPick.objects.filter(game__slug="major-arcana").delete()
    Game.objects.filter(slug="major-arcana").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("games", "0014_add_today_pick"),
    ]

    operations = [
        migrations.RunPython(seed_major_arcana, reverse_seed),
    ]
