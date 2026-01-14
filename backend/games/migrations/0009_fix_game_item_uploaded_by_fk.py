from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("games", "0008_fix_game_created_by_fk"),
    ]

    @staticmethod
    def _drop_fk_forward(apps, schema_editor):
        with schema_editor.connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT CONSTRAINT_NAME
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'gaimification_game_item'
                  AND COLUMN_NAME = 'uploaded_by_id'
                  AND REFERENCED_TABLE_NAME IS NOT NULL
                """
            )
            for (constraint_name,) in cursor.fetchall():
                try:
                    cursor.execute(
                        f"ALTER TABLE gaimification_game_item DROP FOREIGN KEY {constraint_name};"
                    )
                except Exception:
                    pass

    @staticmethod
    def _drop_fk_reverse(apps, schema_editor):
        with schema_editor.connection.cursor() as cursor:
            try:
                cursor.execute(
                    "ALTER TABLE gaimification_game_item DROP FOREIGN KEY gaimification_game_item_uploaded_by_id_fk_accounts_user_id;"
                )
            except Exception:
                pass

    operations = [
        migrations.RunPython(_drop_fk_forward, _drop_fk_reverse),
        migrations.RunSQL(
            """
            ALTER TABLE gaimification_game_item
            MODIFY COLUMN uploaded_by_id bigint NULL;
            """,
            reverse_sql="""
            ALTER TABLE gaimification_game_item
            MODIFY COLUMN uploaded_by_id int NULL;
            """,
        ),
        migrations.RunSQL(
            """
            ALTER TABLE gaimification_game_item
            ADD CONSTRAINT gaimification_game_item_uploaded_by_id_fk_accounts_user_id
            FOREIGN KEY (uploaded_by_id) REFERENCES accounts_user (id)
            ON DELETE SET NULL;
            """,
            reverse_sql="""
            ALTER TABLE gaimification_game_item
            ADD CONSTRAINT gaimification_game_item_uploaded_by_id_64053b2d_fk_auth_user_id
            FOREIGN KEY (uploaded_by_id) REFERENCES auth_user (id)
            ON DELETE SET NULL;
            """,
        ),
    ]
