from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("games", "0009_fix_game_item_uploaded_by_fk"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="GameEditRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="생성 시각")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="수정 시각")),
                (
                    "status",
                    models.CharField(
                        choices=[("PENDING", "승인 대기"), ("APPROVED", "승인"), ("REJECTED", "반려")],
                        default="PENDING",
                        max_length=20,
                        verbose_name="상태",
                    ),
                ),
                ("payload", models.JSONField(verbose_name="요청 내용")),
                ("request_prefix", models.CharField(blank=True, max_length=255, verbose_name="요청 파일 prefix")),
                ("reviewed_at", models.DateTimeField(blank=True, null=True, verbose_name="검토 시각")),
                (
                    "game",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="edit_requests",
                        to="games.game",
                        verbose_name="게임",
                    ),
                ),
                (
                    "reviewed_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="reviewed_game_edit_requests",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="검토자",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="game_edit_requests",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="요청자",
                    ),
                ),
            ],
            options={
                "db_table": "gaimification_game_edit_request",
                "verbose_name": "게임 수정 요청",
                "verbose_name_plural": "게임 수정 요청",
            },
        ),
        migrations.CreateModel(
            name="GameEditRequestHistory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="생성 시각")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="수정 시각")),
                (
                    "action",
                    models.CharField(
                        choices=[("SUBMITTED", "요청"), ("APPROVED", "승인"), ("REJECTED", "반려")],
                        default="SUBMITTED",
                        max_length=20,
                        verbose_name="액션",
                    ),
                ),
                ("payload", models.JSONField(verbose_name="요청 내용")),
                (
                    "game",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="edit_request_history",
                        to="games.game",
                        verbose_name="게임",
                    ),
                ),
                (
                    "request",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="history",
                        to="games.gameeditrequest",
                        verbose_name="요청",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="game_edit_request_history",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="요청자",
                    ),
                ),
            ],
            options={
                "db_table": "gaimification_game_edit_request_history",
                "verbose_name": "게임 수정 요청 기록",
                "verbose_name_plural": "게임 수정 요청 기록",
            },
        ),
        migrations.AddConstraint(
            model_name="gameeditrequest",
            constraint=models.UniqueConstraint(fields=("game", "user"), name="uniq_game_edit_request"),
        ),
    ]
