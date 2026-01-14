from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("games", "0011_expand_game_item_file_name"),
    ]

    operations = [
        migrations.AlterField(
            model_name="gameitem",
            name="file_name",
            field=models.TextField(
                verbose_name="파일명",
                help_text="실제 저장된 파일명 (예: 1.jpg, a83fae.png)",
            ),
        ),
    ]
