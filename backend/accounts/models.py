from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.contrib.auth.models import Group, Permission
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("이메일은 필수입니다.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        return self.create_user(email=email, password=password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    PROVIDER_CHOICES = [
        ("local", "Local"),
        ("google", "Google"),
        ("kakao", "Kakao"),
        ("naver", "Naver"),
        ("apple", "Apple"),
    ]

    email = models.EmailField(unique=True)
    name = models.CharField(max_length=50)
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES, default="local")
    provider_user_id = models.CharField(max_length=128, blank=True, null=True)
    groups = models.ManyToManyField(
        Group,
        related_name="accounts_users",
        blank=True,
        help_text="이 사용자가 속한 그룹",
    )
    user_permissions = models.ManyToManyField(
        Permission,
        related_name="accounts_users",
        blank=True,
        help_text="이 사용자에게 부여된 권한",
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    def __str__(self):
        return self.email


class GamificationProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="gamification_profile")
    nickname = models.CharField(max_length=30, blank=True)
    level = models.PositiveIntegerField(default=1)
    exp = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
