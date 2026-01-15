from django.db import migrations


def set_official_games(apps, schema_editor):
    Game = apps.get_model("games", "Game")
    Game.objects.filter(created_by__is_staff=True, is_official=False).update(is_official=True)


class Migration(migrations.Migration):
    dependencies = [
        ("games", "0016_banner_link_type_game"),
    ]

    operations = [
        migrations.RunPython(set_official_games, migrations.RunPython.noop),
    ]
