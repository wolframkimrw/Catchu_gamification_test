from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.CreateModel(
            name="User",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("password", models.CharField(max_length=128, verbose_name="password")),
                ("last_login", models.DateTimeField(blank=True, null=True, verbose_name="last login")),
                ("email", models.EmailField(max_length=254, unique=True)),
                ("name", models.CharField(max_length=50)),
                ("provider", models.CharField(choices=[("local", "Local"), ("google", "Google"), ("kakao", "Kakao"), ("naver", "Naver"), ("apple", "Apple")], default="local", max_length=20)),
                ("provider_user_id", models.CharField(blank=True, max_length=128, null=True)),
                ("is_active", models.BooleanField(default=True)),
                ("is_staff", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "groups",
                    models.ManyToManyField(
                        blank=True,
                        help_text="이 사용자가 속한 그룹",
                        related_name="accounts_users",
                        to="auth.group",
                    ),
                ),
                (
                    "user_permissions",
                    models.ManyToManyField(
                        blank=True,
                        help_text="이 사용자에게 부여된 권한",
                        related_name="accounts_users",
                        to="auth.permission",
                    ),
                ),
            ],
            options={},
        ),
        migrations.CreateModel(
            name="GamificationProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("nickname", models.CharField(blank=True, max_length=30)),
                ("level", models.PositiveIntegerField(default=1)),
                ("exp", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="gamification_profile",
                        to="accounts.user",
                    ),
                ),
            ],
        ),
    ]
