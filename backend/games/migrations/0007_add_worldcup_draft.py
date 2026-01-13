from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("games", "0006_rename_result_banner_choice_field"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="WorldcupDraft",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("draft_prefix", models.CharField(help_text="드래프트 이미지가 저장되는 폴더 prefix", max_length=255, verbose_name="드래프트 저장 prefix")),
                ("payload", models.JSONField(blank=True, help_text="작성 중인 데이터(JSON)", null=True, verbose_name="드래프트 payload")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="생성 시각")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="수정 시각")),
                ("user", models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="worldcup_drafts", to=settings.AUTH_USER_MODEL, verbose_name="유저")),
            ],
            options={
                "db_table": "gaimification_worldcup_draft",
                "ordering": ["-updated_at"],
                "verbose_name": "월드컵 드래프트",
                "verbose_name_plural": "월드컵 드래프트",
            },
        ),
    ]
