"""config/views.py"""

from rest_framework import status
from rest_framework.views import APIView

from .error_codes import OK
from .exceptions import InvalidSessionException
from .response import api_paginated_response, api_response, resolve_api_name


class BaseAPIView(APIView):
    """Base view that provides api_name resolution and convenience responders."""

    api_name: str | None = None

    def get_api_name(self, request) -> str:
        return self.api_name or resolve_api_name(None, request)

    def respond(
        self,
        data=None,
        *,
        api: str | None = None,
        success: bool = True,
        code: str = OK,
        message: str | None = None,
        pagination: dict | None = None,
        status_code: int = status.HTTP_200_OK,
        request=None,
    ):
        request_obj = request or getattr(self, "request", None)
        resolved_api = api or self.get_api_name(request_obj)
        return api_response(
            data=data,
            api=resolved_api,
            request=request_obj,
            success=success,
            code=code,
            message=message,
            pagination=pagination,
            status_code=status_code,
        )

    def respond_paginated(
        self,
        *,
        page,
        data,
        api: str | None = None,
        code: str = OK,
        message: str | None = None,
        status_code: int = status.HTTP_200_OK,
        request=None,
    ):
        request_obj = request or getattr(self, "request", None)
        resolved_api = api or self.get_api_name(request_obj)
        return api_paginated_response(
            api=resolved_api,
            request=request_obj,
            page=page,
            data=data,
            code=code,
            message=message,
            status_code=status_code,
        )


class PingView(BaseAPIView):
    api_name = "system.ping"

    def get(self, request):
        return self.respond(data={"pong": True})


class TestErrorView(BaseAPIView):
    api_name = "system.test_error"

    def get(self, request):
        raise InvalidSessionException()
