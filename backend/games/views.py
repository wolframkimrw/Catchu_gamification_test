import os
import shutil
import json
from datetime import timedelta
from urllib.parse import urlparse
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.db import models, transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.utils.text import slugify
from config.views import BaseAPIView
from .models import (
    Game,
    GameChoiceLog,
    GameItem,
    GameItemSourceType,
    TodayPick,
    GameEditRequest,
    GameEditRequestHistory,
    GameEditRequestStatus,
    GameEditRequestAction,
    GameResult,
    GameStatus,
    GameVisibility,
    Banner,
    BannerLinkType,
    BannerPosition,
    WorldcupDraft,
    WorldcupPickLog,
)
from .serializers import (
    AdminGameEditRequestSerializer,
    AdminGameEditRequestDetailSerializer,
    GameAdminListSerializer,
    AdminGameDetailSerializer,
    AdminGameChoiceLogSerializer,
    AdminGameResultSerializer,
    AdminWorldcupPickLogSerializer,
    GameListSerializer,
    GameDetailSerializer,
    GameChoiceLogCreateSerializer,
    GameResultCreateSerializer,
    GameResultDetailSerializer,
    BannerSerializer,
    AdminBannerSerializer,
    WorldcupPickLogCreateSerializer,
)
from .image_validation import validate_image_file, validate_image_url
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser, JSONParser
import uuid

# Create your views here.

JSON_BASE_DIR = os.path.join(settings.BASE_DIR, "data", "json")
FRONTEND_JSON_BASE_DIR = os.path.realpath(
    os.path.join(settings.BASE_DIR, "..", "frontend", "src", "utils")
)


def _ensure_json_base_dir():
    os.makedirs(JSON_BASE_DIR, exist_ok=True)


def _resolve_json_path(path_value: str) -> tuple[str, str]:
    if not path_value:
        raise ValidationError({"path": "파일 경로가 필요합니다."})
    normalized = path_value.replace("\\", "/").lstrip("/")
    if ".." in normalized.split("/"):
        raise ValidationError({"path": "허용되지 않는 경로입니다."})
    if not normalized.endswith(".json"):
        raise ValidationError({"path": "json 파일만 가능합니다."})
    _ensure_json_base_dir()
    abs_path = os.path.realpath(os.path.join(JSON_BASE_DIR, normalized))
    base_path = os.path.realpath(JSON_BASE_DIR)
    if not abs_path.startswith(base_path + os.sep):
        raise ValidationError({"path": "허용되지 않는 경로입니다."})
    return abs_path, normalized


def _resolve_frontend_json_path(normalized: str) -> str:
    abs_path = os.path.realpath(os.path.join(FRONTEND_JSON_BASE_DIR, normalized))
    base_path = os.path.realpath(FRONTEND_JSON_BASE_DIR)
    if not abs_path.startswith(base_path + os.sep):
        raise ValidationError({"path": "허용되지 않는 경로입니다."})
    return abs_path


def _cleanup_media_prefix(prefix: str | None) -> None:
    if not prefix:
        return
    normalized = prefix.replace("\\", "/").lstrip("/")
    if ".." in normalized.split("/"):
        return
    abs_path = os.path.realpath(os.path.join(settings.MEDIA_ROOT, normalized))
    base_path = os.path.realpath(settings.MEDIA_ROOT)
    if abs_path.startswith(base_path + os.sep) and os.path.isdir(abs_path):
        shutil.rmtree(abs_path, ignore_errors=True)

class GameListView(BaseAPIView):
    api_name = "games.list"
    
    def get(self, request, *args, **kwargs):
        qs = Game.objects.filter(status="ACTIVE", visibility="PUBLIC")
        serializer = GameListSerializer(qs, many=True)
        return self.respond(data={"games": serializer.data})


class TodayPickView(BaseAPIView):
    api_name = "games.today_pick"

    def get(self, request, *args, **kwargs):
        picks = (
            TodayPick.objects.filter(is_active=True)
            .select_related("game")
            .order_by("-picked_date", "-created_at")
        )
        if not picks.exists():
            return self.respond(data={"picks": []})
        ordered_games = []
        seen = set()
        for pick in picks:
            if pick.game_id in seen:
                continue
            seen.add(pick.game_id)
            ordered_games.append(pick.game)
        serializer = GameListSerializer(ordered_games, many=True)
        return self.respond(data={"picks": serializer.data})
        
class GameDetailView(BaseAPIView):
    api_name = "games.detail"
    
    def get(self, request, game_id: int, *args, **kwargs):
        game = get_object_or_404(Game, pk=game_id)
        serializer = GameDetailSerializer(game)
        return self.respond(data={"game": serializer.data})


class GameChoiceLogCreateView(BaseAPIView):
    api_name = "games.session.create"

    def post(self, request, *args, **kwargs):
        serializer = GameChoiceLogCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        game = get_object_or_404(Game, pk=data["game_id"])
        session = GameChoiceLog.objects.create(
            game=game,
            user=request.user if request.user.is_authenticated else None,
            session_token=uuid.uuid4().hex,
            source=data.get("source", ""),
            referer_url=request.META.get("HTTP_REFERER", ""),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            ip_address=request.META.get("REMOTE_ADDR", ""),
        )
        return self.respond(
            data={"session_id": session.id},
        )


class WorldcupPickLogCreateView(BaseAPIView):
    api_name = "games.worldcup.pick.create"

    def post(self, request, *args, **kwargs):
        serializer = WorldcupPickLogCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        pick = WorldcupPickLog.objects.create(
            choice=data["choice"],
            game=data["game"],
            left_item=data.get("left_item"),
            right_item=data.get("right_item"),
            selected_item=data.get("selected_item"),
            step_index=data["step_index"],
        )
        return self.respond(data={"pick_id": pick.id})


class WorldcupPickSummaryView(BaseAPIView):
    api_name = "games.worldcup.pick.summary"

    def get(self, request, *args, **kwargs):
        game_id = request.query_params.get("game_id")
        if not game_id:
            raise ValidationError({"game_id": "game_id가 필요합니다."})
        try:
            game_id_value = int(game_id)
        except (TypeError, ValueError):
            raise ValidationError({"game_id": "game_id는 숫자여야 합니다."})

        choice_id = request.query_params.get("choice_id")
        try:
            choice_id_value = int(choice_id) if choice_id else None
        except (TypeError, ValueError):
            raise ValidationError({"choice_id": "choice_id는 숫자여야 합니다."})

        logs = WorldcupPickLog.objects.select_related("game").filter(game_id=game_id_value)
        if choice_id_value is not None:
            logs = logs.filter(choice_id=choice_id_value)

        if not logs.exists():
            return self.respond(data={"summary": None})

        game = get_object_or_404(Game, id=game_id_value)
        items = list(game.items.all().order_by("sort_order", "id"))

        counts = {
            row["selected_item_id"]: row["wins"]
            for row in logs.values("selected_item_id")
            .exclude(selected_item_id__isnull=True)
            .annotate(wins=models.Count("id"))
        }

        ranking = [
            {
                "id": item.id,
                "name": item.name,
                "file_name": item.file_name or "",
                "sort_order": item.sort_order,
                "wins": int(counts.get(item.id, 0) or 0),
            }
            for item in items
        ]
        ranking.sort(key=lambda entry: (-entry["wins"], entry["sort_order"], entry["id"]))

        champion = ranking[0] if ranking else None
        total_items = len(items)
        round_count = 0
        if total_items > 0:
            import math

            round_count = int(math.ceil(math.log2(total_items)))

        return self.respond(
            data={
                "summary": {
                    "choice_id": choice_id_value,
                    "game": {"id": game.id, "title": game.title},
                    "total_items": total_items,
                    "round": round_count,
                    "champion": champion,
                    "ranking": ranking,
                }
            }
        )


class GameResultCreateView(BaseAPIView):
    api_name = "games.result.create"

    def post(self, request, *args, **kwargs):
        serializer = GameResultCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        result = GameResult.objects.create(
            choice=data["choice"],
            game=data["game"],
            winner_item=data.get("winner_item"),
            result_title=data["result_title"],
            result_code=data.get("result_code", ""),
            result_image_url=data.get("result_image_url", ""),
            share_url=data.get("share_url", ""),
            result_payload=data.get("result_payload"),
        )
        if not result.choice.finished_at:
            result.choice.finished_at = timezone.now()
            result.choice.save(update_fields=["finished_at"])
        return self.respond(data={"result_id": result.id})


class GameResultDetailView(BaseAPIView):
    api_name = "games.result.detail"

    def get(self, request, *args, **kwargs):
        choice_id = request.query_params.get("choice_id")
        if not choice_id:
            raise ValidationError({"choice_id": "choice_id가 필요합니다."})
        try:
            choice_id_value = int(choice_id)
        except (TypeError, ValueError):
            raise ValidationError({"choice_id": "choice_id는 숫자여야 합니다."})

        result = (
            GameResult.objects.select_related("game", "winner_item")
            .filter(choice_id=choice_id_value)
            .order_by("-created_at")
            .first()
        )
        if not result:
            return self.respond(data={"result": None})
        serializer = GameResultDetailSerializer(result)
        data = serializer.data
        payload = data.get("result_payload")
        if result.game.type == "WORLD_CUP":
            payload_dict = payload if isinstance(payload, dict) else {}
            logs = WorldcupPickLog.objects.select_related("game").filter(game_id=result.game_id)
            items = list(result.game.items.all().order_by("sort_order", "id"))
            counts = {
                row["selected_item_id"]: row["wins"]
                for row in logs.values("selected_item_id")
                .exclude(selected_item_id__isnull=True)
                .annotate(wins=models.Count("id"))
            }
            ranking = [
                {
                    "id": item.id,
                    "name": item.name,
                    "file_name": item.file_name or "",
                    "sort_order": item.sort_order,
                    "wins": int(counts.get(item.id, 0) or 0),
                }
                for item in items
            ]
            ranking.sort(key=lambda entry: (-entry["wins"], entry["sort_order"], entry["id"]))
            total_items = len(items)
            round_count = 0
            if total_items > 0:
                import math

                round_count = int(math.ceil(math.log2(total_items)))
            if not payload_dict.get("total_items"):
                payload_dict["total_items"] = total_items
            if not payload_dict.get("round"):
                payload_dict["round"] = round_count
            if not payload_dict.get("champion"):
                payload_dict["champion"] = ranking[0] if ranking else None
            payload_dict["ranking"] = ranking
            data["result_payload"] = payload_dict
        return self.respond(data={"result": data})




class PsychoTemplateSaveView(BaseAPIView):
    api_name = "games.psycho.template.save"

    def post(self, request, *args, **kwargs):
        slug_value = (request.data.get("slug") or "").strip()
        if not slug_value:
            raise ValidationError({"slug": "slug가 필요합니다."})
        safe_slug = slugify(slug_value)
        if not safe_slug:
            raise ValidationError({"slug": "올바른 slug가 아닙니다."})

        content = request.data.get("content")
        if content is None:
            raise ValidationError({"content": "저장할 내용이 없습니다."})
        if isinstance(content, str):
            try:
                content = json.loads(content)
            except json.JSONDecodeError as exc:
                raise ValidationError({"content": "JSON 형식이 올바르지 않습니다."}) from exc
        if not isinstance(content, dict):
            raise ValidationError({"content": "JSON 객체만 저장할 수 있습니다."})

        content["slug"] = safe_slug
        if not content.get("game_slug"):
            content["game_slug"] = safe_slug

        path = f"psycho/{safe_slug}.json"
        _, normalized = _resolve_json_path(path)
        frontend_path = _resolve_frontend_json_path(normalized)
        os.makedirs(os.path.dirname(frontend_path), exist_ok=True)
        with open(frontend_path, "w", encoding="utf-8") as handle:
            json.dump(content, handle, ensure_ascii=False, indent=2)

        return self.respond(data={"path": normalized, "slug": safe_slug})


class GameJsonReadView(BaseAPIView):
    api_name = "games.json.read"

    def get(self, request, *args, **kwargs):
        path_value = request.query_params.get("path")
        _, normalized = _resolve_json_path(path_value or "")
        frontend_path = _resolve_frontend_json_path(normalized)
        if not os.path.exists(frontend_path):
            raise ValidationError({"path": f"파일이 없습니다: {normalized}"})
        with open(frontend_path, "r", encoding="utf-8") as handle:
            content = json.load(handle)
        return self.respond(data={"path": normalized, "content": content})


def _require_staff(view, request):
    if not request.user or not request.user.is_authenticated:
        return view.respond(
            data=None,
            success=False,
            code="UNAUTHORIZED",
            message="로그인이 필요합니다.",
            status_code=401,
        )
    if not request.user.is_staff:
        return view.respond(
            data=None,
            success=False,
            code="FORBIDDEN",
            message="관리자 권한이 필요합니다.",
            status_code=403,
        )
    return None


def _parse_bool(value, default=False) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    return str(value).lower() in ("true", "1", "yes", "y", "on")


def _parse_optional_datetime(value, field_name: str):
    if value in (None, ""):
        return None
    parsed = parse_datetime(str(value))
    if not parsed:
        raise ValidationError({field_name: "날짜 형식이 올바르지 않습니다."})
    if timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
    return parsed


def _validate_link_url(value: str, field_name: str):
    if not value:
        raise ValidationError({field_name: "링크 URL이 필요합니다."})
    if value.startswith("/"):
        return value
    if value.startswith("http://") or value.startswith("https://"):
        return value
    raise ValidationError({field_name: "http(s) 또는 / 로 시작해야 합니다."})


class WorldcupCreateView(BaseAPIView):
    api_name = "games.worldcup.create"
    parser_classes = (MultiPartParser, FormParser)

    def _parse_items(self, request):
        items = []
        index = 0
        while True:
            name = request.data.get(f"items[{index}].name")
            image = request.FILES.get(f"items[{index}].image")
            image_url = request.data.get(f"items[{index}].image_url")
            if name is None and image is None and image_url is None:
                break
            if image is None and not image_url:
                raise ValidationError({f"items[{index}].image": "아이템 이미지는 필수입니다."})
            if image is not None:
                validate_image_file(image, f"items[{index}].image")
            elif image_url:
                validate_image_url(image_url, f"items[{index}].image_url")
            items.append((name or "", image, image_url))
            index += 1
        return items

    def _ensure_image(self, file_obj, field_name: str) -> None:
        if file_obj is None:
            raise ValidationError({field_name: "이미지를 업로드해 주세요."})
        if file_obj.size > 5 * 1024 * 1024:
            raise ValidationError({field_name: "이미지는 5MB 이하만 가능합니다."})
        if file_obj.content_type not in {
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
        }:
            raise ValidationError({field_name: "지원되지 않는 이미지 형식입니다."})

    def _build_unique_slug(self, title: str) -> str:
        base = slugify(title) or "worldcup"
        while True:
            suffix = uuid.uuid4().hex[:6]
            slug = f"{base}-{suffix}"
            if not Game.objects.filter(slug=slug).exists():
                return slug

    def _save_file(self, storage, storage_prefix: str, file_obj, fallback: str) -> str:
        base, ext = os.path.splitext(file_obj.name)
        safe_base = slugify(base) or fallback
        safe_ext = ext.lower() or ".jpg"
        filename = f"{safe_base}{safe_ext}"
        saved_path = storage.save(f"{storage_prefix}{filename}", file_obj)
        return storage.url(saved_path)

    def _copy_from_media_url(self, storage, storage_prefix: str, media_url: str) -> str:
        path = media_url
        if "://" in media_url:
            path = urlparse(media_url).path
        if not path.startswith(settings.MEDIA_URL):
            return media_url
        relative_path = path[len(settings.MEDIA_URL) :]
        source_path = os.path.join(settings.MEDIA_ROOT, relative_path)
        if not os.path.exists(source_path):
            raise ValidationError({"image_url": "원본 이미지를 찾을 수 없습니다."})
        base_name = os.path.basename(source_path)
        base, ext = os.path.splitext(base_name)
        safe_base = slugify(base) or "item"
        safe_ext = ext.lower() or ".jpg"
        filename = f"{safe_base}{safe_ext}"
        dest_rel = f"{storage_prefix}{filename}"
        dest_abs = os.path.join(settings.MEDIA_ROOT, dest_rel)
        os.makedirs(os.path.dirname(dest_abs), exist_ok=True)
        shutil.copy2(source_path, dest_abs)
        return storage.url(dest_rel)

    def post(self, request, *args, **kwargs):
        title = (request.data.get("title") or "").strip()
        if not title:
            raise ValidationError({"title": "게임 제목을 입력해 주세요."})
        description = (request.data.get("description") or "").strip()
        items = self._parse_items(request)
        if len(items) < 2:
            raise ValidationError({"items": "아이템은 최소 2개 필요합니다."})

        thumbnail = request.FILES.get("thumbnail")
        thumbnail_url = request.data.get("thumbnail_url")
        if thumbnail is not None:
            validate_image_file(thumbnail, "thumbnail")
        elif thumbnail_url:
            validate_image_url(thumbnail_url, "thumbnail_url")

        slug = self._build_unique_slug(title)
        storage_prefix = f"worldcup/{slug}/"
        storage = FileSystemStorage(
            location=settings.MEDIA_ROOT, base_url=settings.MEDIA_URL
        )

        with transaction.atomic():
            game = Game.objects.create(
                title=title,
                description=description,
                slug=slug,
                type="WORLD_CUP",
                status="ACTIVE",
                created_by=request.user if request.user.is_authenticated else None,
                is_official=bool(request.user.is_authenticated and request.user.is_staff),
                visibility="PRIVATE",
                thumbnail_image_url="",
                storage_prefix=storage_prefix,
            )

            GameItem = game.items.model
            item_urls = []
            for sort_order, (name, image, image_url) in enumerate(items):
                if image is not None:
                    url = self._save_file(
                        storage, storage_prefix, image, f"item-{sort_order + 1}"
                    )
                elif image_url:
                    url = self._copy_from_media_url(storage, storage_prefix, image_url)
                else:
                    raise ValidationError({"items": "아이템 이미지가 필요합니다."})
                item_urls.append(url)
                GameItem.objects.create(
                    game=game,
                    name=name,
                    file_name=url,
                    sort_order=sort_order,
                    uploaded_by=request.user if request.user.is_authenticated else None,
                    source_type=(
                        GameItemSourceType.OFFICIAL
                        if request.user.is_authenticated and request.user.is_staff
                        else GameItemSourceType.USER_UPLOAD
                    ),
                )

            if thumbnail is not None:
                thumbnail_url = self._save_file(
                    storage, storage_prefix, thumbnail, "thumbnail"
                )
            elif thumbnail_url:
                thumbnail_url = self._copy_from_media_url(storage, storage_prefix, thumbnail_url)
            else:
                thumbnail_url = item_urls[0]

            game.thumbnail_image_url = thumbnail_url
            game.save(update_fields=["thumbnail_image_url"])

        draft_id = request.data.get("draft_id")
        if draft_id and request.user.is_authenticated:
            draft = WorldcupDraft.objects.filter(id=draft_id, user=request.user).first()
            if draft and draft.draft_prefix:
                draft_path = os.path.join(settings.MEDIA_ROOT, draft.draft_prefix)
                if os.path.isdir(draft_path):
                    shutil.rmtree(draft_path, ignore_errors=True)
            WorldcupDraft.objects.filter(id=draft_id, user=request.user).delete()
        else:
            draft_code = request.data.get("draft_code")
            if draft_code and request.user.is_authenticated:
                draft = WorldcupDraft.objects.filter(
                    draft_code=draft_code, user=request.user
                ).first()
                if draft and draft.draft_prefix:
                    draft_path = os.path.join(settings.MEDIA_ROOT, draft.draft_prefix)
                    if os.path.isdir(draft_path):
                        shutil.rmtree(draft_path, ignore_errors=True)
                WorldcupDraft.objects.filter(
                    draft_code=draft_code, user=request.user
                ).delete()

        return self.respond(
            data={
                "game_id": game.id,
                "slug": game.slug,
                "thumbnail_image_url": game.thumbnail_image_url,
            },
            status_code=201,
        )


class WorldcupDraftView(BaseAPIView):
    api_name = "games.worldcup.draft"
    parser_classes = (MultiPartParser, FormParser)

    def _require_user(self, request):
        if not request.user or not request.user.is_authenticated:
            raise ValidationError("로그인이 필요합니다.")
        return request.user

    def _cleanup_old_drafts(self, user):
        cutoff = timezone.now() - timedelta(days=1)
        old_drafts = WorldcupDraft.objects.filter(user=user, updated_at__lt=cutoff)
        for draft in old_drafts:
            if draft.draft_prefix:
                draft_path = os.path.join(settings.MEDIA_ROOT, draft.draft_prefix)
                if os.path.isdir(draft_path):
                    shutil.rmtree(draft_path, ignore_errors=True)
        old_drafts.delete()

    def _generate_draft_code(self):
        return f"draft_{uuid.uuid4().hex[:12]}"

    def _ensure_draft_code(self):
        code = self._generate_draft_code()
        while WorldcupDraft.objects.filter(draft_code=code).exists():
            code = self._generate_draft_code()
        return code

    def _save_draft_files(self, user, request):
        draft_prefix = f"worldcup/drafts/{user.id}/{uuid.uuid4().hex}/"
        storage = FileSystemStorage(
            location=settings.MEDIA_ROOT, base_url=settings.MEDIA_URL
        )
        items = []
        index = 0
        while True:
            name = request.data.get(f"items[{index}].name")
            image = request.FILES.get(f"items[{index}].image")
            image_url = request.data.get(f"items[{index}].image_url")
            if name is None and image is None and image_url is None:
                break
            if image is not None:
                validate_image_file(image, f"items[{index}].image")
                url = WorldcupCreateView._save_file(
                    self, storage, draft_prefix, image, f"item-{index + 1}"
                )
            else:
                validate_image_url(image_url or "", f"items[{index}].image_url")
                url = image_url or ""
            items.append({"name": name or "", "image_url": url})
            index += 1

        thumbnail = request.FILES.get("thumbnail")
        thumbnail_url = request.data.get("thumbnail_url") or ""
        if thumbnail is not None:
            validate_image_file(thumbnail, "thumbnail")
            thumbnail_url = WorldcupCreateView._save_file(
                self, storage, draft_prefix, thumbnail, "thumbnail"
            )
        elif thumbnail_url:
            validate_image_url(thumbnail_url, "thumbnail_url")

        payload = {
            "title": (request.data.get("title") or "").strip(),
            "description": (request.data.get("description") or "").strip(),
            "thumbnail_url": thumbnail_url,
            "items": items,
        }
        return draft_prefix, payload

    def get(self, request, *args, **kwargs):
        user = self._require_user(request)
        self._cleanup_old_drafts(user)
        draft = WorldcupDraft.objects.filter(user=user).order_by("-updated_at").first()
        if not draft:
            return self.respond(data={"draft": None})
        return self.respond(
            data={
                "draft": {
                    "id": draft.id,
                    "draft_code": draft.draft_code,
                    **(draft.payload or {}),
                }
            }
        )

    def post(self, request, *args, **kwargs):
        user = self._require_user(request)
        self._cleanup_old_drafts(user)
        draft_code = (request.data.get("draft_code") or "").strip()
        existing = None
        if draft_code:
            existing = WorldcupDraft.objects.filter(
                user=user, draft_code=draft_code
            ).first()
        draft_prefix, payload = self._save_draft_files(user, request)
        if existing:
            if existing.draft_prefix:
                draft_path = os.path.join(settings.MEDIA_ROOT, existing.draft_prefix)
                if os.path.isdir(draft_path):
                    shutil.rmtree(draft_path, ignore_errors=True)
            existing.draft_prefix = draft_prefix
            existing.payload = payload
            existing.save(update_fields=["draft_prefix", "payload", "updated_at"])
            draft = existing
        else:
            draft = WorldcupDraft.objects.create(
                user=user,
                draft_prefix=draft_prefix,
                payload=payload,
                draft_code=self._ensure_draft_code(),
            )
        return self.respond(
            data={"draft": {"draft_code": draft.draft_code, **payload}},
            status_code=201,
        )


class WorldcupDraftListView(BaseAPIView):
    api_name = "games.worldcup.drafts"

    def get(self, request, *args, **kwargs):
        if not request.user or not request.user.is_authenticated:
            raise ValidationError("로그인이 필요합니다.")
        WorldcupDraftView()._cleanup_old_drafts(request.user)
        drafts = (
            WorldcupDraft.objects.filter(user=request.user)
            .order_by("-updated_at")
        )
        return self.respond(
            data={
                "drafts": [
                    {
                        "draft_code": draft.draft_code,
                        "title": (draft.payload or {}).get("title") or "",
                        "updated_at": draft.updated_at.isoformat(),
                    }
                    for draft in drafts
                ]
            }
        )


class WorldcupDraftDetailView(BaseAPIView):
    api_name = "games.worldcup.draft_detail"

    def get(self, request, draft_code, *args, **kwargs):
        if not request.user or not request.user.is_authenticated:
            raise ValidationError("로그인이 필요합니다.")
        WorldcupDraftView()._cleanup_old_drafts(request.user)
        draft = WorldcupDraft.objects.filter(
            user=request.user, draft_code=draft_code
        ).first()
        if not draft:
            return self.respond(data={"draft": None})
        return self.respond(
            data={
                "draft": {
                    "draft_code": draft.draft_code,
                    **(draft.payload or {}),
                }
            }
        )


class BannerListView(BaseAPIView):
    api_name = "banners.list"

    def get(self, request, *args, **kwargs):
        position = request.query_params.get("position")
        now = timezone.now()
        qs = Banner.objects.filter(is_active=True).filter(
            models.Q(start_at__isnull=True) | models.Q(start_at__lte=now),
            models.Q(end_at__isnull=True) | models.Q(end_at__gte=now),
        )
        if position:
            qs = qs.filter(position=position)
        qs = qs.order_by("priority", "created_at", "id")
        serializer = BannerSerializer(qs, many=True)
        return self.respond(data={"banners": serializer.data})


class AdminBannerListView(WorldcupCreateView):
    api_name = "admin.banners.list"
    parser_classes = (MultiPartParser, FormParser)

    def get(self, request, *args, **kwargs):
        denied = _require_staff(self, request)
        if denied:
            return denied
        qs = Banner.objects.all().select_related("game").order_by("-created_at")
        serializer = AdminBannerSerializer(qs, many=True)
        return self.respond(data={"banners": serializer.data})

    def post(self, request, *args, **kwargs):
        denied = _require_staff(self, request)
        if denied:
            return denied

        name = (request.data.get("name") or "").strip()
        if not name:
            raise ValidationError({"name": "배너 이름이 필요합니다."})
        position = (request.data.get("position") or "").strip()
        if not position:
            raise ValidationError({"position": "배너 위치가 필요합니다."})
        if position not in BannerPosition.values:
            raise ValidationError({"position": "올바른 배너 위치가 아닙니다."})

        link_type = request.data.get("link_type") or BannerLinkType.URL
        if link_type not in BannerLinkType.values:
            raise ValidationError({"link_type": "올바른 링크 타입이 아닙니다."})

        game_id = request.data.get("game_id")
        link_url = (request.data.get("link_url") or "").strip()

        game = None
        if link_type == BannerLinkType.GAME:
            if not game_id:
                raise ValidationError({"game_id": "게임 선택이 필요합니다."})
            game = get_object_or_404(Game, pk=game_id)
            link_url = ""
        else:
            link_url = _validate_link_url(link_url, "link_url")

        image = request.FILES.get("image")
        image_url = (request.data.get("image_url") or "").strip()
        if image is None and not image_url:
            raise ValidationError({"image": "이미지 업로드 또는 URL이 필요합니다."})

        storage = FileSystemStorage(
            location=settings.MEDIA_ROOT, base_url=settings.MEDIA_URL
        )
        storage_prefix = "wc-banner-media/"

        if image is not None:
            self._ensure_image(image, "image")
            final_image_url = self._save_file(storage, storage_prefix, image, "banner")
        else:
            final_image_url = self._copy_from_media_url(
                storage, storage_prefix, image_url
            )

        is_active = _parse_bool(request.data.get("is_active"), default=True)
        priority = request.data.get("priority")
        priority_value = int(priority) if priority not in (None, "") else 0

        start_at = _parse_optional_datetime(request.data.get("start_at"), "start_at")
        end_at = _parse_optional_datetime(request.data.get("end_at"), "end_at")

        banner = Banner.objects.create(
            name=name,
            position=position,
            image_url=final_image_url,
            link_type=link_type,
            game=game,
            link_url=link_url,
            is_active=is_active,
            priority=priority_value,
            start_at=start_at,
            end_at=end_at,
        )
        serializer = AdminBannerSerializer(banner)
        return self.respond(data={"banner": serializer.data}, status_code=201)


class AdminBannerDetailView(WorldcupCreateView):
    api_name = "admin.banners.detail"
    parser_classes = (MultiPartParser, FormParser)

    def patch(self, request, banner_id: int, *args, **kwargs):
        denied = _require_staff(self, request)
        if denied:
            return denied
        banner = get_object_or_404(Banner, pk=banner_id)
        updates = []

        name = request.data.get("name")
        if name is not None:
            banner.name = str(name).strip()
            updates.append("name")

        position = request.data.get("position")
        if position is not None:
            position_value = str(position).strip()
            if position_value not in BannerPosition.values:
                raise ValidationError({"position": "올바른 배너 위치가 아닙니다."})
            banner.position = position_value
            updates.append("position")

        link_type = request.data.get("link_type")
        game_id = request.data.get("game_id")
        link_url = request.data.get("link_url")
        if link_type is not None and link_type not in BannerLinkType.values:
            raise ValidationError({"link_type": "올바른 링크 타입이 아닙니다."})

        if link_type is not None or game_id is not None or link_url is not None:
            next_link_type = link_type or banner.link_type
            next_game_id = game_id if game_id not in (None, "") else banner.game_id
            next_link_url = (
                str(link_url).strip()
                if link_url is not None
                else (banner.link_url or "")
            )

            if next_link_type == BannerLinkType.GAME:
                if not next_game_id:
                    raise ValidationError({"game_id": "게임 선택이 필요합니다."})
                banner.game = get_object_or_404(Game, pk=next_game_id)
                banner.link_type = BannerLinkType.GAME
                banner.link_url = ""
            else:
                next_link_url = _validate_link_url(next_link_url, "link_url")
                banner.link_type = BannerLinkType.URL
                banner.game = None
                banner.link_url = next_link_url
            updates.extend(["link_type", "game", "link_url"])

        image = request.FILES.get("image")
        image_url = request.data.get("image_url")
        if image is not None or image_url is not None:
            storage = FileSystemStorage(
                location=settings.MEDIA_ROOT, base_url=settings.MEDIA_URL
            )
            storage_prefix = "wc-banner-media/"
            if image is not None:
                self._ensure_image(image, "image")
                banner.image_url = self._save_file(
                    storage, storage_prefix, image, "banner"
                )
            else:
                image_url_value = str(image_url).strip()
                if not image_url_value:
                    raise ValidationError({"image_url": "이미지 URL이 필요합니다."})
                banner.image_url = self._copy_from_media_url(
                    storage, storage_prefix, image_url_value
                )
            updates.append("image_url")

        if "is_active" in request.data:
            banner.is_active = _parse_bool(
                request.data.get("is_active"), default=banner.is_active
            )
            updates.append("is_active")

        if "priority" in request.data:
            priority = request.data.get("priority")
            banner.priority = int(priority) if priority not in (None, "") else 0
            updates.append("priority")

        if "start_at" in request.data:
            banner.start_at = _parse_optional_datetime(
                request.data.get("start_at"), "start_at"
            )
            updates.append("start_at")

        if "end_at" in request.data:
            banner.end_at = _parse_optional_datetime(
                request.data.get("end_at"), "end_at"
            )
            updates.append("end_at")

        if not updates:
            raise ValidationError({"detail": "수정할 값이 없습니다."})

        banner.save(update_fields=list(set(updates)))
        serializer = AdminBannerSerializer(banner)
        return self.respond(data={"banner": serializer.data})

    def delete(self, request, banner_id: int, *args, **kwargs):
        denied = _require_staff(self, request)
        if denied:
            return denied
        banner = get_object_or_404(Banner, pk=banner_id)
        banner.delete()
        return self.respond(data={"deleted": True})


class MyGameListView(BaseAPIView):
    api_name = "games.mine"

    def get(self, request, *args, **kwargs):
        if not request.user or not request.user.is_authenticated:
            return self.respond(
                data=None,
                success=False,
                code="UNAUTHORIZED",
                message="로그인이 필요합니다.",
                status_code=401,
            )
        qs = Game.objects.filter(created_by=request.user).order_by("-created_at")
        serializer = GameListSerializer(qs, many=True)
        return self.respond(data={"games": serializer.data})


class GameEditRequestView(WorldcupCreateView):
    api_name = "games.edit_request"
    parser_classes = (MultiPartParser, FormParser)

    def _parse_items(self, request):
        items = []
        index = 0
        while True:
            name = request.data.get(f"items[{index}].name")
            image = request.FILES.get(f"items[{index}].image")
            image_url = request.data.get(f"items[{index}].image_url")
            item_id = request.data.get(f"items[{index}].id")
            if name is None and image is None and image_url is None and item_id is None:
                break
            if image is None and not image_url:
                raise ValidationError({f"items[{index}].image": "아이템 이미지는 필수입니다."})
            if image is not None:
                validate_image_file(image, f"items[{index}].image")
            elif image_url:
                validate_image_url(image_url, f"items[{index}].image_url")
            parsed_id = None
            if item_id not in (None, ""):
                try:
                    parsed_id = int(item_id)
                except (TypeError, ValueError):
                    raise ValidationError({f"items[{index}].id": "아이템 ID가 올바르지 않습니다."})
            items.append(
                {
                    "id": parsed_id,
                    "name": (name or "").strip(),
                    "image": image,
                    "image_url": image_url,
                    "sort_order": index,
                }
            )
            index += 1
        return items

    def post(self, request, *args, **kwargs):
        if not request.user or not request.user.is_authenticated:
            return self.respond(
                data=None,
                success=False,
                code="UNAUTHORIZED",
                message="로그인이 필요합니다.",
                status_code=401,
            )
        game_id = request.data.get("game_id")
        if not game_id:
            raise ValidationError({"game_id": "게임 ID가 필요합니다."})
        game = get_object_or_404(Game, pk=game_id)
        if game.created_by_id != request.user.id and not request.user.is_staff:
            return self.respond(
                data=None,
                success=False,
                code="FORBIDDEN",
                message="본인의 게임만 수정 요청할 수 있습니다.",
                status_code=403,
            )

        title = (request.data.get("title") or "").strip()
        if not title:
            raise ValidationError({"title": "게임 제목을 입력해 주세요."})
        description = (request.data.get("description") or "").strip()

        items = self._parse_items(request)
        if len(items) < 2:
            raise ValidationError({"items": "아이템은 최소 2개 필요합니다."})

        thumbnail = request.FILES.get("thumbnail")
        thumbnail_url = request.data.get("thumbnail_url")
        if thumbnail is not None:
            validate_image_file(thumbnail, "thumbnail")
        elif thumbnail_url:
            validate_image_url(thumbnail_url, "thumbnail_url")

        request_prefix = f"worldcup/edit-requests/{game.id}/{uuid.uuid4().hex}/"
        storage = FileSystemStorage(
            location=settings.MEDIA_ROOT, base_url=settings.MEDIA_URL
        )

        if thumbnail is not None:
            thumbnail_url = self._save_file(storage, request_prefix, thumbnail, "thumbnail")
        elif thumbnail_url:
            thumbnail_url = self._copy_from_media_url(storage, request_prefix, thumbnail_url)

        payload_items = []
        for item in items:
            image_url = item["image_url"]
            if item["image"] is not None:
                image_url = self._save_file(
                    storage, request_prefix, item["image"], f"item-{item['sort_order'] + 1}"
                )
            elif image_url:
                image_url = self._copy_from_media_url(storage, request_prefix, image_url)
            payload_items.append(
                {
                    "id": item["id"],
                    "name": item["name"],
                    "image_url": image_url,
                    "sort_order": item["sort_order"],
                }
            )

        payload = {
            "title": title,
            "description": description,
            "items": payload_items,
        }
        if thumbnail_url:
            payload["thumbnail_url"] = thumbnail_url

        existing_request = GameEditRequest.objects.filter(
            game=game, user=request.user
        ).first()
        if existing_request:
            old_prefix = existing_request.request_prefix
            existing_request.request_prefix = request_prefix
            existing_request.payload = payload
            existing_request.status = GameEditRequestStatus.PENDING
            existing_request.reviewed_by = None
            existing_request.reviewed_at = None
            existing_request.save(
                update_fields=[
                    "request_prefix",
                    "payload",
                    "status",
                    "reviewed_by",
                    "reviewed_at",
                    "updated_at",
                ]
            )
            edit_request = existing_request
            if old_prefix and old_prefix != request_prefix:
                _cleanup_media_prefix(old_prefix)
        else:
            edit_request = GameEditRequest.objects.create(
                game=game,
                user=request.user,
                status=GameEditRequestStatus.PENDING,
                payload=payload,
                request_prefix=request_prefix,
            )

        GameEditRequestHistory.objects.create(
            request=edit_request,
            game=game,
            user=request.user,
            action=GameEditRequestAction.SUBMITTED,
            payload=payload,
        )

        return self.respond(
            data={"request_id": edit_request.id, "status": edit_request.status},
            status_code=201,
        )


class AdminGameListView(BaseAPIView):
    api_name = "admin.games.list"

    def get(self, request, *args, **kwargs):
        denied = _require_staff(self, request)
        if denied:
            return denied
        qs = Game.objects.all().order_by("-created_at")
        serializer = GameAdminListSerializer(qs, many=True)
        return self.respond(data={"games": serializer.data})


class AdminTodayPickView(BaseAPIView):
    api_name = "admin.today_pick"

    def get(self, request, *args, **kwargs):
        denied = _require_staff(self, request)
        if denied:
            return denied
        picks = (
            TodayPick.objects.filter(is_active=True)
            .select_related("game")
            .order_by("-picked_date", "-created_at")
        )
        if not picks.exists():
            return self.respond(data={"picks": []})
        ordered_games = []
        seen = set()
        for pick in picks:
            if pick.game_id in seen:
                continue
            seen.add(pick.game_id)
            ordered_games.append(pick.game)
        serializer = GameAdminListSerializer(ordered_games, many=True)
        return self.respond(data={"picks": serializer.data})

    def post(self, request, *args, **kwargs):
        denied = _require_staff(self, request)
        if denied:
            return denied
        game_id = request.data.get("game_id")
        if not game_id:
            raise ValidationError({"game_id": "게임 ID가 필요합니다."})
        is_active = request.data.get("is_active", True)
        if isinstance(is_active, str):
            is_active = is_active.lower() in ("true", "1", "yes", "y")
        else:
            is_active = bool(is_active)
        game = get_object_or_404(Game, pk=game_id)
        if is_active:
            exists = TodayPick.objects.filter(game=game, is_active=True).exists()
            if not exists:
                TodayPick.objects.create(
                    game=game,
                    picked_date=timezone.localdate(),
                    is_active=True,
                    created_by=request.user,
                )
        else:
            TodayPick.objects.filter(game=game, is_active=True).update(is_active=False)
        picks = (
            TodayPick.objects.filter(is_active=True)
            .select_related("game")
            .order_by("-picked_date", "-created_at")
        )
        ordered_games = []
        seen = set()
        for pick in picks:
            if pick.game_id in seen:
                continue
            seen.add(pick.game_id)
            ordered_games.append(pick.game)
        serializer = GameAdminListSerializer(ordered_games, many=True)
        return self.respond(data={"picks": serializer.data})


class AdminGameEditRequestListView(BaseAPIView):
    api_name = "admin.edit_requests.list"

    def get(self, request, *args, **kwargs):
        denied = _require_staff(self, request)
        if denied:
            return denied
        qs = (
            GameEditRequest.objects.filter(status=GameEditRequestStatus.PENDING)
            .select_related("game", "user")
            .order_by("-updated_at")
        )
        serializer = AdminGameEditRequestSerializer(qs, many=True)
        return self.respond(data={"requests": serializer.data})


class AdminGameEditRequestDetailView(BaseAPIView):
    api_name = "admin.edit_requests.detail"

    def get(self, request, request_id: int, *args, **kwargs):
        denied = _require_staff(self, request)
        if denied:
            return denied
        edit_request = get_object_or_404(GameEditRequest, pk=request_id)
        serializer = AdminGameEditRequestDetailSerializer(edit_request)
        return self.respond(data={"request": serializer.data})


class AdminGameEditRequestApproveView(WorldcupCreateView):
    api_name = "admin.edit_requests.approve"
    parser_classes = (JSONParser, FormParser, MultiPartParser)

    def _normalize_image_url(self, storage, game: Game, image_url: str) -> str:
        if not image_url:
            return ""
        path = urlparse(image_url).path
        if path.startswith(settings.MEDIA_URL):
            relative_path = path[len(settings.MEDIA_URL) :]
            if relative_path.startswith(game.storage_prefix):
                return image_url
            return self._copy_from_media_url(storage, game.storage_prefix, image_url)
        return image_url

    def post(self, request, *args, **kwargs):
        denied = _require_staff(self, request)
        if denied:
            return denied
        request_id = request.data.get("request_id")
        if not request_id:
            raise ValidationError({"request_id": "요청 ID가 필요합니다."})
        edit_request = get_object_or_404(GameEditRequest, pk=request_id)
        if edit_request.status != GameEditRequestStatus.PENDING:
            raise ValidationError({"request_id": "이미 처리된 요청입니다."})

        payload = edit_request.payload or {}
        items = payload.get("items") or []
        if len(items) < 2:
            raise ValidationError({"items": "아이템은 최소 2개 필요합니다."})

        storage = FileSystemStorage(
            location=settings.MEDIA_ROOT, base_url=settings.MEDIA_URL
        )

        with transaction.atomic():
            game = edit_request.game
            updates = []
            title = (payload.get("title") or "").strip()
            if title:
                game.title = title
                updates.append("title")
            description = (payload.get("description") or "").strip()
            game.description = description
            updates.append("description")
            thumbnail_url = payload.get("thumbnail_url")
            if thumbnail_url:
                game.thumbnail_image_url = self._normalize_image_url(storage, game, thumbnail_url)
                updates.append("thumbnail_image_url")
            if updates:
                game.save(update_fields=updates)

            existing_items = {item.id: item for item in game.items.all()}
            payload_ids = set()
            for item_data in items:
                item_id = item_data.get("id")
                name = (item_data.get("name") or "").strip()
                image_url = item_data.get("image_url")
                sort_order = item_data.get("sort_order")
                try:
                    sort_order = int(sort_order) if sort_order is not None else 0
                except (TypeError, ValueError):
                    sort_order = 0
                if item_id and item_id in existing_items:
                    item = existing_items[item_id]
                    item_updates = []
                    if item.name != name:
                        item.name = name
                        item_updates.append("name")
                    if image_url:
                        normalized = self._normalize_image_url(storage, game, image_url)
                        if item.file_name != normalized:
                            item.file_name = normalized
                            item_updates.append("file_name")
                    if item.sort_order != sort_order:
                        item.sort_order = sort_order
                        item_updates.append("sort_order")
                    if item_updates:
                        item.save(update_fields=item_updates)
                    payload_ids.add(item_id)
                else:
                    if not image_url:
                        raise ValidationError({"items": "새 아이템에는 이미지가 필요합니다."})
                    normalized = self._normalize_image_url(storage, game, image_url)
                    created = GameItem.objects.create(
                        game=game,
                        name=name,
                        file_name=normalized,
                        sort_order=sort_order,
                        uploaded_by=edit_request.user,
                        source_type=GameItemSourceType.USER_UPLOAD,
                    )
                    payload_ids.add(created.id)

            for item_id, item in existing_items.items():
                if item_id not in payload_ids:
                    item.delete()

            edit_request.status = GameEditRequestStatus.APPROVED
            edit_request.reviewed_by = request.user
            edit_request.reviewed_at = timezone.now()
            edit_request.save(update_fields=["status", "reviewed_by", "reviewed_at", "updated_at"])

            GameEditRequestHistory.objects.create(
                request=edit_request,
                game=game,
                user=edit_request.user,
                action=GameEditRequestAction.APPROVED,
                payload=payload,
            )
            _cleanup_media_prefix(edit_request.request_prefix)

        return self.respond(
            data={"request_id": edit_request.id, "status": edit_request.status}
        )


class AdminGameEditRequestRejectView(BaseAPIView):
    api_name = "admin.edit_requests.reject"

    def post(self, request, *args, **kwargs):
        denied = _require_staff(self, request)
        if denied:
            return denied
        request_id = request.data.get("request_id")
        if not request_id:
            raise ValidationError({"request_id": "요청 ID가 필요합니다."})
        edit_request = get_object_or_404(GameEditRequest, pk=request_id)
        if edit_request.status != GameEditRequestStatus.PENDING:
            raise ValidationError({"request_id": "이미 처리된 요청입니다."})

        edit_request.status = GameEditRequestStatus.REJECTED
        edit_request.reviewed_by = request.user
        edit_request.reviewed_at = timezone.now()
        edit_request.save(update_fields=["status", "reviewed_by", "reviewed_at", "updated_at"])

        GameEditRequestHistory.objects.create(
            request=edit_request,
            game=edit_request.game,
            user=edit_request.user,
            action=GameEditRequestAction.REJECTED,
            payload=edit_request.payload or {},
        )
        _cleanup_media_prefix(edit_request.request_prefix)

        return self.respond(
            data={"request_id": edit_request.id, "status": edit_request.status}
        )


class AdminGameDetailView(BaseAPIView):
    api_name = "admin.games.detail"

    def get(self, request, game_id: int, *args, **kwargs):
        denied = _require_staff(self, request)
        if denied:
            return denied
        game = get_object_or_404(Game, pk=game_id)
        serializer = AdminGameDetailSerializer(game)
        return self.respond(data={"game": serializer.data})


class AdminGameUpdateView(BaseAPIView):
    api_name = "admin.games.update"

    def post(self, request, *args, **kwargs):
        denied = _require_staff(self, request)
        if denied:
            return denied
        game_id = request.data.get("game_id")
        if not game_id:
            raise ValidationError({"game_id": "게임 ID가 필요합니다."})
        game = get_object_or_404(Game, pk=game_id)
        visibility = request.data.get("visibility")
        status = request.data.get("status")
        updates = []
        if visibility:
            if visibility not in {choice for choice, _ in GameVisibility.choices}:
                raise ValidationError({"visibility": "유효하지 않은 공개 범위입니다."})
            game.visibility = visibility
            updates.append("visibility")
        if status:
            if status not in {choice for choice, _ in GameStatus.choices}:
                raise ValidationError({"status": "유효하지 않은 상태입니다."})
            game.status = status
            updates.append("status")
        title = request.data.get("title")
        if title is not None:
            cleaned = str(title).strip()
            if not cleaned:
                raise ValidationError({"title": "제목은 비워둘 수 없습니다."})
            game.title = cleaned
            updates.append("title")
        description = request.data.get("description")
        if description is not None:
            game.description = str(description).strip()
            updates.append("description")
        if updates:
            game.save(update_fields=updates)
        return self.respond(data={"game_id": game.id, "visibility": game.visibility, "status": game.status})


class AdminGameDeleteView(BaseAPIView):
    api_name = "admin.games.delete"

    def delete(self, request, game_id: int, *args, **kwargs):
        denied = _require_staff(self, request)
        if denied:
            return denied
        game = get_object_or_404(Game, pk=game_id)
        game.delete()
        return self.respond(data={"deleted": True})


class AdminGameItemUpdateView(BaseAPIView):
    api_name = "admin.games.items.update"
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        denied = _require_staff(self, request)
        if denied:
            return denied
        item_id = request.data.get("item_id")
        if not item_id:
            raise ValidationError({"item_id": "아이템 ID가 필요합니다."})
        item = get_object_or_404(GameItem, pk=item_id)
        updates = []

        is_active = request.data.get("is_active")
        if is_active is not None:
            item.is_active = (
                bool(is_active) if isinstance(is_active, bool) else str(is_active).lower() == "true"
            )
            updates.append("is_active")

        name = request.data.get("name")
        if name is not None:
            item.name = str(name).strip()
            updates.append("name")

        image = request.FILES.get("image")
        if image is not None:
            WorldcupCreateView._ensure_image(self, image, "image")
            storage = FileSystemStorage(
                location=settings.MEDIA_ROOT, base_url=settings.MEDIA_URL
            )
            storage_prefix = item.game.storage_prefix or f"worldcup/{item.game.slug}/"
            item.file_name = WorldcupCreateView._save_file(self, storage, storage_prefix, image, "item")
            updates.append("file_name")

        if not updates:
            raise ValidationError({"detail": "수정할 값이 없습니다."})

        item.save(update_fields=updates)
        return self.respond(
            data={
                "item_id": item.id,
                "is_active": item.is_active,
                "name": item.name,
                "file_name": item.file_name,
            }
        )


class AdminGameItemCreateView(BaseAPIView):
    api_name = "admin.games.items.create"
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        denied = _require_staff(self, request)
        if denied:
            return denied
        game_id = request.data.get("game_id")
        if not game_id:
            raise ValidationError({"game_id": "게임 ID가 필요합니다."})
        game = get_object_or_404(Game, pk=game_id)
        name = (request.data.get("name") or "").strip()
        image = request.FILES.get("image")
        if image is None:
            raise ValidationError({"image": "이미지를 업로드해 주세요."})
        WorldcupCreateView._ensure_image(self, image, "image")

        storage = FileSystemStorage(
            location=settings.MEDIA_ROOT, base_url=settings.MEDIA_URL
        )
        storage_prefix = game.storage_prefix or f"worldcup/{game.slug}/"
        url = WorldcupCreateView._save_file(self, storage, storage_prefix, image, "item")

        max_order = game.items.aggregate(models.Max("sort_order")).get("sort_order__max")
        next_order = (max_order + 1) if max_order is not None else 0
        item = GameItem.objects.create(
            game=game,
            name=name,
            file_name=url,
            sort_order=next_order,
            uploaded_by=request.user if request.user.is_authenticated else None,
            source_type=(
                GameItemSourceType.OFFICIAL
                if request.user.is_authenticated and request.user.is_staff
                else GameItemSourceType.USER_UPLOAD
            ),
        )
        return self.respond(
            data={"item_id": item.id, "file_name": item.file_name, "sort_order": item.sort_order},
            status_code=201,
        )


class AdminGameItemDeleteView(BaseAPIView):
    api_name = "admin.games.items.delete"

    def delete(self, request, item_id: int, *args, **kwargs):
        denied = _require_staff(self, request)
        if denied:
            return denied
        item = get_object_or_404(GameItem, pk=item_id)
        item.delete()
        return self.respond(data={"deleted": True, "item_id": item_id})


class AdminGameChoiceLogListView(BaseAPIView):
    api_name = "admin.logs.choice"

    def get(self, request, *args, **kwargs):
        denied = _require_staff(self, request)
        if denied:
            return denied
        qs = GameChoiceLog.objects.select_related("game", "user").order_by("-started_at")[:200]
        serializer = AdminGameChoiceLogSerializer(qs, many=True)
        return self.respond(data={"logs": serializer.data})


class AdminWorldcupPickLogListView(BaseAPIView):
    api_name = "admin.logs.pick"

    def get(self, request, *args, **kwargs):
        denied = _require_staff(self, request)
        if denied:
            return denied
        qs = WorldcupPickLog.objects.select_related("game", "selected_item").order_by("-created_at")[:200]
        serializer = AdminWorldcupPickLogSerializer(qs, many=True)
        return self.respond(data={"logs": serializer.data})


class AdminGameResultListView(BaseAPIView):
    api_name = "admin.results.list"

    def get(self, request, *args, **kwargs):
        denied = _require_staff(self, request)
        if denied:
            return denied
        game_id_value = request.query_params.get("game_id")
        if game_id_value:
            try:
                game_id = int(game_id_value)
            except (TypeError, ValueError) as exc:
                raise ValidationError({"game_id": "올바른 게임 ID가 아닙니다."}) from exc
            qs = GameResult.objects.filter(game_id=game_id)
            total_results = qs.count()
            ranking_rows = (
                qs.values("winner_item_id", "winner_item__name")
                .annotate(count=models.Count("id"))
                .order_by("-count", "winner_item__name", "winner_item_id")
            )
            ranking = [
                {
                    "id": row["winner_item_id"],
                    "name": row["winner_item__name"] or "미지정",
                    "count": row["count"],
                }
                for row in ranking_rows
            ]
            return self.respond(data={"total_results": total_results, "ranking": ranking})
        qs = GameResult.objects.select_related("game", "winner_item").order_by("-created_at")[:200]
        serializer = AdminGameResultSerializer(qs, many=True)
        return self.respond(data={"results": serializer.data})


class AdminJsonListView(BaseAPIView):
    api_name = "admin.json.list"

    def get(self, request, *args, **kwargs):
        denied = _require_staff(self, request)
        if denied:
            return denied
        if not os.path.isdir(FRONTEND_JSON_BASE_DIR):
            return self.respond(data={"files": []})
        files = []
        for root, _, filenames in os.walk(FRONTEND_JSON_BASE_DIR):
            for filename in filenames:
                if not filename.endswith(".json"):
                    continue
                full_path = os.path.join(root, filename)
                rel_path = os.path.relpath(full_path, FRONTEND_JSON_BASE_DIR).replace("\\", "/")
                files.append(rel_path)
        files.sort()
        return self.respond(data={"files": files})


class AdminJsonDetailView(BaseAPIView):
    api_name = "admin.json.detail"

    def get(self, request, *args, **kwargs):
        denied = _require_staff(self, request)
        if denied:
            return denied
        path_value = request.query_params.get("path")
        _, normalized = _resolve_json_path(path_value or "")
        frontend_path = _resolve_frontend_json_path(normalized)
        if not os.path.exists(frontend_path):
            raise ValidationError({"path": f"파일이 없습니다: {normalized}"})
        with open(frontend_path, "r", encoding="utf-8") as handle:
            content = json.load(handle)
        return self.respond(data={"path": normalized, "content": content})

    def post(self, request, *args, **kwargs):
        denied = _require_staff(self, request)
        if denied:
            return denied
        path_value = request.data.get("path")
        content = request.data.get("content")
        _, normalized = _resolve_json_path(path_value or "")
        if content is None:
            raise ValidationError({"content": "저장할 내용이 없습니다."})
        try:
            frontend_path = _resolve_frontend_json_path(normalized)
            os.makedirs(os.path.dirname(frontend_path), exist_ok=True)
            with open(frontend_path, "w", encoding="utf-8") as handle:
                json.dump(content, handle, ensure_ascii=False, indent=2)
        except ValidationError:
            raise
        except OSError:
            pass
        return self.respond(data={"path": normalized})
