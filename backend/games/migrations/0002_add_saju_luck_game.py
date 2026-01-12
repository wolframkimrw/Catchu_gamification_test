from django.db import migrations


def create_saju_luck_game(apps, schema_editor):
    Game = apps.get_model("games", "Game")
    slug = "saju-luck"

    if Game.objects.filter(slug=slug).exists():
        return

    Game.objects.create(
        title="오늘의 사주 운세",
        description="오늘의 기운을 확인하는 사주 운세 게임",
        slug=slug,
        type="FORTUNE_TEST",
        status="ACTIVE",
        parent_topic=None,
        created_by=None,
        is_official=True,
        visibility="PUBLIC",
        thumbnail_image_url=(
            "https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17"
            "?w=800&q=80&auto=format&fit=crop"
        ),
        storage_prefix="fortune/saju-luck/",
    )


def remove_saju_luck_game(apps, schema_editor):
    Game = apps.get_model("games", "Game")
    Game.objects.filter(slug="saju-luck").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("games", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(create_saju_luck_game, remove_saju_luck_game),
    ]
