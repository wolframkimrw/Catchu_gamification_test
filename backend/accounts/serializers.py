from rest_framework import serializers

from .utils.validators import (
    validate_email,
    validate_name,
    validate_password,
    validate_password_match,
)

ALLOWED_PROVIDERS = {"local", "google", "kakao", "naver", "apple"}


def _normalize_provider(value: str | None) -> str:
    if not value:
        return "local"
    return value.strip().lower()


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(required=False, allow_blank=True, write_only=True)
    provider = serializers.CharField(required=False, allow_blank=True)
    provider_access_token = serializers.CharField(required=False, allow_blank=True, write_only=True)

    def validate(self, attrs):
        provider = _normalize_provider(attrs.get("provider"))
        if provider not in ALLOWED_PROVIDERS:
            raise serializers.ValidationError("지원하지 않는 로그인 방식입니다.")

        if provider == "local":
            validate_email(attrs.get("email", ""))
            validate_password(attrs.get("password", ""))
        else:
            token = attrs.get("provider_access_token")
            if not token:
                raise serializers.ValidationError("소셜 로그인 토큰이 필요합니다.")
        attrs["provider"] = provider
        return attrs


class SignupSerializer(serializers.Serializer):
    name = serializers.CharField()
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)
    provider = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        provider = _normalize_provider(attrs.get("provider"))
        if provider != "local":
            raise serializers.ValidationError("현재는 이메일 회원가입만 지원합니다.")
        validate_name(attrs.get("name", ""))
        validate_email(attrs.get("email", ""))
        validate_password(attrs.get("password", ""))
        validate_password_match(attrs.get("password", ""), attrs.get("password_confirm", ""))
        attrs["provider"] = provider
        return attrs


class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return validate_email(value)
