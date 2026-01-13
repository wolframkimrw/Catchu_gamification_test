from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("games", "0005_rename_pick_choice_field"),
    ]

    operations = [
        migrations.RenameField(
            model_name="gameresult",
            old_name="session",
            new_name="choice",
        ),
        migrations.RenameField(
            model_name="bannerclicklog",
            old_name="session",
            new_name="choice",
        ),
    ]
