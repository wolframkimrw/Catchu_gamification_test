import base64
import os
from io import BytesIO
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from django.conf import settings
from rest_framework.exceptions import ValidationError
from PIL import Image

MAX_REMOTE_IMAGE_BYTES = 5 * 1024 * 1024
REMOTE_IMAGE_TIMEOUT_SECONDS = 5


def _read_limited(response, max_bytes: int, field_name: str) -> bytes:
    data = bytearray()
    while True:
        chunk = response.read(8192)
        if not chunk:
            break
        data.extend(chunk)
        if len(data) > max_bytes:
            raise ValidationError({field_name: "이미지 URL을 불러올 수 없습니다."})
    return bytes(data)


def _validate_image_bytes(data: bytes, field_name: str) -> None:
    try:
        with Image.open(BytesIO(data)) as image:
            image.verify()
    except Exception as exc:  # noqa: BLE001
        raise ValidationError({field_name: "이미지 URL을 불러올 수 없습니다."}) from exc


def validate_image_file(file_obj, field_name: str) -> None:
    if file_obj is None:
        return
    try:
        with Image.open(file_obj) as image:
            image.verify()
    except Exception as exc:  # noqa: BLE001 - 이미지 파싱 실패는 검증 에러로 처리
        raise ValidationError({field_name: "이미지 파일을 확인할 수 없습니다."}) from exc
    finally:
        try:
            file_obj.seek(0)
        except Exception:
            pass


def validate_image_url(image_url: str, field_name: str) -> None:
    if not image_url:
        return
    value = str(image_url).strip()
    if value.startswith("data:image/"):
        try:
            header, encoded = value.split(",", 1)
            data = base64.b64decode(encoded, validate=True)
        except Exception as exc:  # noqa: BLE001
            raise ValidationError({field_name: "이미지 URL을 불러올 수 없습니다."}) from exc
        _validate_image_bytes(data, field_name)
        return
    parsed = urlparse(value)
    path = parsed.path if parsed.scheme else value
    if path.startswith(settings.MEDIA_URL):
        relative_path = path[len(settings.MEDIA_URL) :]
        file_path = os.path.join(settings.MEDIA_ROOT, relative_path)
        if not os.path.exists(file_path):
            raise ValidationError({field_name: "이미지 URL을 불러올 수 없습니다."})
        try:
            with Image.open(file_path) as image:
                image.verify()
        except Exception as exc:  # noqa: BLE001
            raise ValidationError({field_name: "이미지 파일을 확인할 수 없습니다."}) from exc
        return
    if value.startswith("/"):
        raise ValidationError({field_name: "이미지 URL을 불러올 수 없습니다."})
    if parsed.scheme in ("http", "https"):
        try:
            request = Request(
                value,
                headers={"User-Agent": "Mozilla/5.0", "Accept": "image/*"},
            )
            with urlopen(request, timeout=REMOTE_IMAGE_TIMEOUT_SECONDS) as response:
                data = _read_limited(response, MAX_REMOTE_IMAGE_BYTES, field_name)
        except Exception as exc:  # noqa: BLE001
            raise ValidationError({field_name: "이미지 URL을 불러올 수 없습니다."}) from exc
        _validate_image_bytes(data, field_name)
        return
    raise ValidationError({field_name: "이미지 URL을 불러올 수 없습니다."})
