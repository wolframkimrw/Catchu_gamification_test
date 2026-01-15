import os
from urllib.parse import urlparse

from django.conf import settings
from rest_framework.exceptions import ValidationError
from PIL import Image

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".png"}
MIN_IMAGE_DIMENSION = 200
MAX_IMAGE_DIMENSION = 4000


def _validate_image_dimensions(width: int, height: int, field_name: str) -> None:
    if min(width, height) < MIN_IMAGE_DIMENSION or max(width, height) > MAX_IMAGE_DIMENSION:
        raise ValidationError({field_name: "이미지 해상도는 200px 이상, 4000px 이하만 가능합니다."})


def _validate_image_extension(path: str, field_name: str) -> None:
    ext = os.path.splitext(path)[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise ValidationError({field_name: "이미지는 jpg 또는 png만 가능합니다."})


def validate_image_file(file_obj, field_name: str) -> None:
    if file_obj is None:
        return
    _validate_image_extension(file_obj.name or "", field_name)
    try:
        with Image.open(file_obj) as image:
            width, height = image.size
    except Exception as exc:  # noqa: BLE001 - 이미지 파싱 실패는 검증 에러로 처리
        raise ValidationError({field_name: "이미지 파일을 확인할 수 없습니다."}) from exc
    finally:
        try:
            file_obj.seek(0)
        except Exception:
            pass
    _validate_image_dimensions(width, height, field_name)


def validate_image_url(image_url: str, field_name: str) -> None:
    if not image_url:
        return
    value = str(image_url).strip()
    parsed = urlparse(value)
    if not (parsed.scheme in ("http", "https") or value.startswith("/")):
        raise ValidationError({field_name: "이미지 URL만 가능합니다."})
    path = parsed.path if parsed.scheme else value
    _validate_image_extension(path, field_name)
    if path.startswith(settings.MEDIA_URL):
        relative_path = path[len(settings.MEDIA_URL) :]
        file_path = os.path.join(settings.MEDIA_ROOT, relative_path)
        if os.path.exists(file_path):
            try:
                with Image.open(file_path) as image:
                    width, height = image.size
            except Exception as exc:  # noqa: BLE001
                raise ValidationError({field_name: "이미지 파일을 확인할 수 없습니다."}) from exc
            _validate_image_dimensions(width, height, field_name)
