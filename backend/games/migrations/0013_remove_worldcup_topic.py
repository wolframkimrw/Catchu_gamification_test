from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("games", "0012_expand_game_item_file_name_text"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="game",
            name="parent_topic",
        ),
        migrations.DeleteModel(
            name="WorldcupTopic",
        ),
    ]
