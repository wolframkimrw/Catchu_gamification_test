from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("games", "0007_add_worldcup_draft"),
    ]

    @staticmethod
    def _drop_fk_forward(apps, schema_editor):
        with schema_editor.connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT CONSTRAINT_NAME
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'gaimification_game'
                  AND COLUMN_NAME = 'created_by_id'
                  AND REFERENCED_TABLE_NAME IS NOT NULL
                """
            )
            for (constraint_name,) in cursor.fetchall():
                try:
                    cursor.execute(
                        f"ALTER TABLE gaimification_game DROP FOREIGN KEY {constraint_name};"
                    )
                except Exception:
                    pass

    @staticmethod
    def _drop_fk_reverse(apps, schema_editor):
        with schema_editor.connection.cursor() as cursor:
            try:
                cursor.execute(
                    "ALTER TABLE gaimification_game DROP FOREIGN KEY gaimification_game_created_by_id_fk_accounts_user_id;"
                )
            except Exception:
                pass

    operations = [
        migrations.RunPython(_drop_fk_forward, _drop_fk_reverse),
        migrations.RunSQL(
            """
            ALTER TABLE gaimification_game
            MODIFY COLUMN created_by_id bigint NULL;
            """,
            reverse_sql="""
            ALTER TABLE gaimification_game
            MODIFY COLUMN created_by_id int NULL;
            """,
        ),
        migrations.RunSQL(
            """
            ALTER TABLE gaimification_game
            ADD CONSTRAINT gaimification_game_created_by_id_fk_accounts_user_id
            FOREIGN KEY (created_by_id) REFERENCES accounts_user (id)
            ON DELETE SET NULL;
            """,
            reverse_sql="""
            ALTER TABLE gaimification_game
            ADD CONSTRAINT gaimification_game_created_by_id_703a3633_fk_auth_user_id
            FOREIGN KEY (created_by_id) REFERENCES auth_user (id)
            ON DELETE SET NULL;
            """,
        ),
    ]
