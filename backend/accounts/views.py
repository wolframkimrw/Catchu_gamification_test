from django.contrib.auth import authenticate, login
from django.contrib.auth import get_user_model
from rest_framework import status

from config.views import BaseAPIView
from .models import GamificationProfile
from .serializers import (
    AdminUserSerializer,
    AdminUserUpdateSerializer,
    LoginSerializer,
    ResetPasswordSerializer,
    SignupSerializer,
)


class LoginView(BaseAPIView):
    api_name = "accounts.login"

    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        provider = serializer.validated_data.get("provider", "local")
        if provider != "local":
            return self.respond(
                data={"status": "READY", "provider": provider},
                status_code=status.HTTP_200_OK,
            )

        email = serializer.validated_data.get("email")
        password = serializer.validated_data.get("password")
        user = authenticate(request, email=email, password=password)
        if not user:
            return self.respond(
                data=None,
                success=False,
                code="INVALID_CREDENTIALS",
                message="이메일 또는 비밀번호가 올바르지 않습니다.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        login(request, user)
        return self.respond(
            data={
                "status": "OK",
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "name": user.name,
                    "is_staff": user.is_staff,
                },
            },
            status_code=status.HTTP_200_OK,
        )


class SignupView(BaseAPIView):
    api_name = "accounts.signup"

    def post(self, request, *args, **kwargs):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        User = get_user_model()
        if User.objects.filter(email=data["email"]).exists():
            return self.respond(
                data=None,
                success=False,
                code="DUPLICATE_EMAIL",
                message="이미 가입된 이메일입니다.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        user = User.objects.create_user(
            email=data["email"],
            password=data["password"],
            name=data["name"],
            provider="local",
        )
        GamificationProfile.objects.get_or_create(user=user)
        return self.respond(
            data={
                "status": "OK",
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "name": user.name,
                    "is_staff": user.is_staff,
                },
            },
            status_code=status.HTTP_201_CREATED,
        )


class ResetPasswordView(BaseAPIView):
    api_name = "accounts.reset_password"

    def post(self, request, *args, **kwargs):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # TODO: 이메일 발송 로직 연결
        return self.respond(
            data={"status": "OK"},
            status_code=status.HTTP_200_OK,
        )


class AdminUserListView(BaseAPIView):
    api_name = "admin.users.list"

    def get(self, request, *args, **kwargs):
        if not request.user or not request.user.is_authenticated:
            return self.respond(
                data=None,
                success=False,
                code="UNAUTHORIZED",
                message="로그인이 필요합니다.",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )
        if not request.user.is_staff:
            return self.respond(
                data=None,
                success=False,
                code="FORBIDDEN",
                message="관리자 권한이 필요합니다.",
                status_code=status.HTTP_403_FORBIDDEN,
            )
        User = get_user_model()
        qs = User.objects.all().select_related("gamification_profile").order_by("-created_at")[:200]
        serializer = AdminUserSerializer(qs, many=True)
        return self.respond(data={"users": serializer.data})


class AdminUserDetailView(BaseAPIView):
    api_name = "admin.users.detail"

    def patch(self, request, user_id: int, *args, **kwargs):
        if not request.user or not request.user.is_authenticated:
            return self.respond(
                data=None,
                success=False,
                code="UNAUTHORIZED",
                message="로그인이 필요합니다.",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )
        if not request.user.is_staff:
            return self.respond(
                data=None,
                success=False,
                code="FORBIDDEN",
                message="관리자 권한이 필요합니다.",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        serializer = AdminUserUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        User = get_user_model()
        try:
            user = User.objects.select_related("gamification_profile").get(id=user_id)
        except User.DoesNotExist:
            return self.respond(
                data=None,
                success=False,
                code="NOT_FOUND",
                message="유저를 찾을 수 없습니다.",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        updated = False
        if "is_active" in serializer.validated_data:
            user.is_active = serializer.validated_data["is_active"]
            updated = True
        if "is_staff" in serializer.validated_data:
            user.is_staff = serializer.validated_data["is_staff"]
            updated = True
        if updated:
            user.save(update_fields=["is_active", "is_staff"])

        return self.respond(data={"user": AdminUserSerializer(user).data})
