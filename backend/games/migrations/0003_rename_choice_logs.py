from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("games", "0002_add_saju_luck_game"),
    ]

    operations = [
        migrations.RenameModel(
            old_name="GameChoiceLog",
            new_name="WorldcupPickLog",
        ),
        migrations.AlterModelTable(
            name="worldcuppicklog",
            table="gaimification_worldcup_pick_log",
        ),
        migrations.RenameModel(
            old_name="GameSession",
            new_name="GameChoiceLog",
        ),
        migrations.AlterModelTable(
            name="gamechoicelog",
            table="gaimification_game_choice_log",
        ),
    ]
