from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("games", "0015_seed_major_arcana_today_pick"),
    ]

    operations = [
        migrations.AddField(
            model_name="banner",
            name="link_type",
            field=models.CharField(
                choices=[("GAME", "게임 연결"), ("URL", "URL 링크")],
                default="URL",
                max_length=20,
                verbose_name="링크 타입",
            ),
        ),
        migrations.AddField(
            model_name="banner",
            name="game",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="banners",
                to="games.game",
                verbose_name="연결 게임",
            ),
        ),
        migrations.AlterField(
            model_name="banner",
            name="link_url",
            field=models.URLField(blank=True, max_length=255, verbose_name="링크 URL"),
        ),
    ]
