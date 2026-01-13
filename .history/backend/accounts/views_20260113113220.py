from rest_framework import status

from config.views import BaseAPIView
from .serializers import LoginSerializer, ResetPasswordSerializer, SignupSerializer


class LoginView(BaseAPIView):
    api_name = "accounts.login"

    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        provider = serializer.validated_data.get("provider", "local")
        return self.respond(
            data={"status": "READY", "provider": provider},
            status_code=status.HTTP_200_OK,
        )


class SignupView(BaseAPIView):
    api_name = "accounts.signup"

    def post(self, request, *args, **kwargs):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self.respond(
            data={"status": "READY"},
            status_code=status.HTTP_201_CREATED,
        )


class ResetPasswordView(BaseAPIView):
    api_name = "accounts.reset_password"

    def post(self, request, *args, **kwargs):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self.respond(
            data={"status": "READY"},
            status_code=status.HTTP_200_OK,
        )
