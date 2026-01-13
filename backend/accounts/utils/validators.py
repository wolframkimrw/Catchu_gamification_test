from django.core.validators import EmailValidator
from rest_framework import serializers


_EMAIL_VALIDATOR = EmailValidator()


def validate_email(value: str) -> str:
    if not value:
        raise serializers.ValidationError("이메일을 입력해 주세요.")
    try:
        _EMAIL_VALIDATOR(value)
    except Exception as exc:  # EmailValidator raises ValidationError
        raise serializers.ValidationError("이메일 형식이 올바르지 않습니다.") from exc
    return value


def validate_password(value: str) -> str:
    if not value:
        raise serializers.ValidationError("비밀번호를 입력해 주세요.")
    if len(value) < 8:
        raise serializers.ValidationError("비밀번호는 8자 이상이어야 합니다.")
    if len(value) > 128:
        raise serializers.ValidationError("비밀번호가 너무 깁니다.")
    return value


def validate_name(value: str) -> str:
    if not value:
        raise serializers.ValidationError("이름을 입력해 주세요.")
    if len(value.strip()) < 2:
        raise serializers.ValidationError("이름은 2자 이상 입력해 주세요.")
    return value.strip()


def validate_password_match(password: str, confirm: str) -> None:
    if password != confirm:
        raise serializers.ValidationError("비밀번호가 일치하지 않습니다.")
