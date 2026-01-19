from django.db import migrations, models
import uuid


def _generate_code() -> str:
    return f"draft_{uuid.uuid4().hex[:12]}"


def forwards(apps, schema_editor):
    WorldcupDraft = apps.get_model("games", "WorldcupDraft")
    existing = set(
        WorldcupDraft.objects.exclude(draft_code__isnull=True)
        .exclude(draft_code__exact="")
        .values_list("draft_code", flat=True)
    )
    for draft in WorldcupDraft.objects.filter(draft_code__isnull=True) | WorldcupDraft.objects.filter(
        draft_code__exact=""
    ):
        code = _generate_code()
        while code in existing:
            code = _generate_code()
        existing.add(code)
        draft.draft_code = code
        draft.save(update_fields=["draft_code"])


def backwards(apps, schema_editor):
    WorldcupDraft = apps.get_model("games", "WorldcupDraft")
    WorldcupDraft.objects.update(draft_code=None)


class Migration(migrations.Migration):
    dependencies = [
        ("games", "0017_backfill_official_games"),
    ]

    operations = [
        migrations.AddField(
            model_name="worldcupdraft",
            name="draft_code",
            field=models.CharField(
                max_length=32,
                null=True,
                blank=True,
                unique=True,
                db_index=True,
                verbose_name="드래프트 코드",
            ),
        ),
        migrations.RunPython(forwards, backwards),
        migrations.AlterField(
            model_name="worldcupdraft",
            name="draft_code",
            field=models.CharField(
                max_length=32,
                unique=True,
                db_index=True,
                verbose_name="드래프트 코드",
            ),
        ),
    ]
