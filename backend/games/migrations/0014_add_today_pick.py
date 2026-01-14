from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("games", "0013_remove_worldcup_topic"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="TodayPick",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="생성 시각")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="수정 시각")),
                ("picked_date", models.DateField(verbose_name="추천 날짜")),
                ("is_active", models.BooleanField(default=True, verbose_name="활성 여부")),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="today_picks",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="설정한 관리자",
                    ),
                ),
                (
                    "game",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="today_picks",
                        to="games.game",
                        verbose_name="오늘의 추천 게임",
                    ),
                ),
            ],
            options={
                "verbose_name": "오늘의 추천",
                "verbose_name_plural": "오늘의 추천",
                "db_table": "gaimification_today_pick",
                "ordering": ["-picked_date", "-created_at"],
            },
        ),
    ]
