"""config/exceptions.py"""

from typing import Any

from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

from . import error_codes
from .response import api_response
from http import HTTPStatus


class InvalidSessionException(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "세션이 유효하지 않습니다."
    default_code = error_codes.INVALID_SESSION


class InvalidRequestException(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "잘못된 요청입니다."
    default_code = error_codes.INVALID_REQUEST


def _flatten_code(codes: Any) -> str | None:
    """Extract a representative code string from nested DRF codes."""
    if isinstance(codes, str):
        return codes
    if isinstance(codes, dict):
        for value in codes.values():
            flattened = _flatten_code(value)
            if flattened:
                return flattened
    if isinstance(codes, list):
        for value in codes:
            flattened = _flatten_code(value)
            if flattened:
                return flattened
    return None


def _resolve_code(exc: Exception, response: Response | None) -> str:
    if hasattr(exc, "default_code") and getattr(exc, "default_code"):
        return str(getattr(exc, "default_code"))
    if hasattr(exc, "get_codes"):
        flattened = _flatten_code(exc.get_codes())
        if flattened:
            return str(flattened)
    if response is not None:
        try:
            status_enum = HTTPStatus(response.status_code)
            return status_enum.phrase.replace(" ", "_").upper()
        except ValueError:
            return str(response.status_code)
        return str(response.status_code)
    return error_codes.ERROR


def _resolve_message(exc: Exception) -> str | None:
    if hasattr(exc, "detail"):
        detail = getattr(exc, "detail")
        if isinstance(detail, (list, dict)):
            return str(detail)
        return str(detail)
    return str(exc)


def _resolve_api_identifier(context: dict) -> str:
    view = context.get("view")
    if view and getattr(view, "api_name", None):
        return str(view.api_name)
    request = context.get("request")
    if request and getattr(request, "api_name", None):
        return str(request.api_name)
    if request and getattr(request, "resolver_match", None):
        match = request.resolver_match
        if match and match.view_name:
            return str(match.view_name)
        if match and match.route:
            return str(match.route)
    if request and getattr(request, "path", None):
        return str(request.path)
    return "unknown"


def custom_exception_handler(exc: Exception, context: dict) -> Response:
    """Wrap DRF exceptions into the unified meta/data envelope."""
    drf_response = drf_exception_handler(exc, context)
    api_identifier = _resolve_api_identifier(context)

    if drf_response is None:
        return api_response(
            data=None,
            api=api_identifier,
            success=False,
            code=error_codes.SERVER_ERROR,
            message="서버 오류가 발생했습니다.",
            pagination=None,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    code = _resolve_code(exc, drf_response)
    message = _resolve_message(exc)

    return api_response(
        data=None,
        api=api_identifier,
        success=False,
        code=code,
        message=message,
        pagination=None,
        status_code=drf_response.status_code,
    )
