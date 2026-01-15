from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("games", "0017_backfill_official_games"),
    ]

    operations = [
        migrations.AddField(
            model_name="game",
            name="worldcup_round_size",
            field=models.PositiveIntegerField(
                blank=True,
                null=True,
                help_text="월드컵 진행 시 사용할 강수(참가 아이템 수 기준)",
                verbose_name="월드컵 강수",
            ),
        ),
    ]
