from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("games", "0004_fix_game_choice_log_user_fk"),
    ]

    operations = [
        migrations.RenameField(
            model_name="worldcuppicklog",
            old_name="session",
            new_name="choice",
        ),
    ]
