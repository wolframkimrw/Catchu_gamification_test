from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("games", "0003_rename_choice_logs"),
    ]

    @staticmethod
    def _drop_fk_if_exists(schema_editor, constraint_name: str) -> None:
        try:
            schema_editor.execute(
                f"ALTER TABLE gaimification_game_choice_log DROP FOREIGN KEY {constraint_name};"
            )
        except Exception:
            pass

    @staticmethod
    def _drop_fk_forward(apps, schema_editor):
        Migration._drop_fk_if_exists(
            schema_editor, "gaimification_game_session_user_id_ee52c70b_fk_auth_user_id"
        )
        Migration._drop_fk_if_exists(
            schema_editor, "gaimification_game_choice_log_user_id_fk_accounts_user_id"
        )

    @staticmethod
    def _drop_fk_reverse(apps, schema_editor):
        Migration._drop_fk_if_exists(
            schema_editor, "gaimification_game_choice_log_user_id_fk_accounts_user_id"
        )
        Migration._drop_fk_if_exists(
            schema_editor, "gaimification_game_session_user_id_ee52c70b_fk_auth_user_id"
        )

    operations = [
        migrations.RunPython(_drop_fk_forward, _drop_fk_reverse),
        migrations.RunSQL(
            """
            ALTER TABLE gaimification_game_choice_log
            MODIFY COLUMN user_id bigint NULL;
            """,
            reverse_sql="""
            ALTER TABLE gaimification_game_choice_log
            MODIFY COLUMN user_id int NULL;
            """,
        ),
        migrations.RunSQL(
            """
            ALTER TABLE gaimification_game_choice_log
            ADD CONSTRAINT gaimification_game_choice_log_user_id_fk_accounts_user_id
            FOREIGN KEY (user_id) REFERENCES accounts_user (id)
            ON DELETE SET NULL;
            """,
            reverse_sql="""
            ALTER TABLE gaimification_game_choice_log
            ADD CONSTRAINT gaimification_game_session_user_id_ee52c70b_fk_auth_user_id
            FOREIGN KEY (user_id) REFERENCES auth_user (id)
            ON DELETE SET NULL;
            """,
        ),
    ]
