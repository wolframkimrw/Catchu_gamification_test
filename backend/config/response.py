"""config/response.py"""

from typing import Any

from rest_framework import status
from rest_framework.response import Response

from .error_codes import OK


def resolve_api_name(api: str | None, request: Any = None) -> str:
    """Pick an API identifier from explicit arg, request.api_name, resolver, or path."""
    if api:
        return str(api)
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


def _build_pagination(page: Any) -> dict | None:
    """Convert a PageNumberPagination page into a meta.pagination dict."""
    if page is None:
        return None
    paginator = getattr(page, "paginator", None)
    if paginator is None:
        return None
    page_number = getattr(page, "number", None)
    page_size = getattr(paginator, "per_page", None) or getattr(paginator, "page_size", None)
    total = getattr(paginator, "count", None)
    has_next = page.has_next() if hasattr(page, "has_next") else None
    has_previous = page.has_previous() if hasattr(page, "has_previous") else None
    return {
        "page": page_number,
        "page_size": page_size,
        "total": total,
        "has_next": has_next,
        "has_previous": has_previous,
    }


def api_response(
    data: Any = None,
    *,
    api: str | None = None,
    request: Any = None,
    success: bool = True,
    code: str = OK,
    message: str | None = None,
    pagination: dict | None = None,
    status_code: int = status.HTTP_200_OK,
) -> Response:
    """Wrap responses in the unified meta/data envelope."""
    resolved_api = resolve_api_name(api, request)
    meta = {
        "api": resolved_api,
        "success": success,
        "code": code,
        "message": message,
        "pagination": pagination,
    }
    return Response({"meta": meta, "data": data}, status=status_code)


def api_paginated_response(
    *,
    api: str | None = None,
    request: Any = None,
    page: Any,
    data: Any,
    code: str = OK,
    message: str | None = None,
    status_code: int = status.HTTP_200_OK,
) -> Response:
    """Shortcut to wrap paginated lists with meta.pagination filled automatically."""
    pagination = _build_pagination(page)
    return api_response(
        data=data,
        api=api,
        request=request,
        success=True,
        code=code,
        message=message,
        pagination=pagination,
        status_code=status_code,
    )
