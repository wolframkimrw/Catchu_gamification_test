# backend/games/models.py

from django.conf import settings
from django.db import models


# --------------------------------------------------
# 공통 베이스: 생성/수정 시각
# --------------------------------------------------
class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성 시각")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="수정 시각")

    class Meta:
        abstract = True


# --------------------------------------------------
# Game (게임 정의 / blueprint)
# --------------------------------------------------
class GameType(models.TextChoices):
    WORLD_CUP = "WORLD_CUP", "이상형 월드컵"
    FORTUNE_TEST = "FORTUNE_TEST", "운세 테스트"
    PSYCHOLOGICAL = "PSYCHOLOGICAL", "심리테스트"
    QUIZ = "QUIZ", "퀴즈"
    # 필요한 타입 계속 추가 가능


class GameStatus(models.TextChoices):
    DRAFT = "DRAFT", "작성중"
    ACTIVE = "ACTIVE", "진행중"
    STOPPED = "STOPPED", "중지됨"
    ARCHIVED = "ARCHIVED", "보관됨"


class GameVisibility(models.TextChoices):
    PUBLIC = "PUBLIC", "공개"
    PRIVATE = "PRIVATE", "비공개"
    UNLISTED = "UNLISTED", "링크 공개"


class Game(TimeStampedModel):
    title = models.CharField(max_length=100, verbose_name="게임 제목")
    description = models.TextField(blank=True, verbose_name="설명")
    slug = models.SlugField(max_length=100, unique=True, verbose_name="URL 경로")

    type = models.CharField(
        max_length=20,
        choices=GameType.choices,
        default=GameType.WORLD_CUP,
        verbose_name="게임 타입",
    )
    status = models.CharField(
        max_length=20,
        choices=GameStatus.choices,
        default=GameStatus.DRAFT,
        verbose_name="상태",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_games",
        verbose_name="생성 유저",
    )

    is_official = models.BooleanField(default=False, verbose_name="공식 게임 여부")
    visibility = models.CharField(
        max_length=20,
        choices=GameVisibility.choices,
        default=GameVisibility.PUBLIC,
        verbose_name="공개 범위",
    )

    thumbnail_image_url = models.URLField(
        max_length=255, blank=True, verbose_name="썸네일 URL"
    )

    # 예: worldcup/ab12cd/ 형태
    storage_prefix = models.CharField(
        max_length=255,
        verbose_name="스토리지 prefix",
        help_text="이미지 등이 저장되는 폴더 prefix (예: worldcup/ab12cd/)",
    )

    start_at = models.DateTimeField(null=True, blank=True, verbose_name="노출 시작 시각")
    end_at = models.DateTimeField(null=True, blank=True, verbose_name="노출 종료 시각")

    class Meta:
        db_table = "gaimification_game"
        ordering = ["-created_at"]
        verbose_name = "게임"
        verbose_name_plural = "게임"

    def __str__(self) -> str:
        return f"[{self.type}] {self.title}"


# --------------------------------------------------
# GameItem (게임 내 컨텐츠: 후보 이미지/선택지)
# --------------------------------------------------
class GameItemSourceType(models.TextChoices):
    USER_UPLOAD = "USER_UPLOAD", "유저 업로드"
    OFFICIAL = "OFFICIAL", "공식"


class GameItem(TimeStampedModel):
    game = models.ForeignKey(
        Game,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name="게임",
    )

    name = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="후보명",
        help_text="표시용 이름, 비워두면 프론트에서 기본값으로 처리 가능",
    )

    # storage_prefix + file_name 으로 실제 경로 구성
    file_name = models.TextField(
        verbose_name="파일명",
        help_text="실제 저장된 파일명 (예: 1.jpg, a83fae.png)",
    )

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_game_items",
        verbose_name="업로더",
    )

    source_type = models.CharField(
        max_length=20,
        choices=GameItemSourceType.choices,
        default=GameItemSourceType.USER_UPLOAD,
        verbose_name="소스 타입",
    )

    sort_order = models.IntegerField(default=0, verbose_name="정렬 순서")

    is_active = models.BooleanField(default=True, verbose_name="활성 여부")
    is_approved = models.BooleanField(default=True, verbose_name="승인 여부")
    is_blocked = models.BooleanField(default=False, verbose_name="차단 여부")

    report_count = models.IntegerField(default=0, verbose_name="신고 횟수")

    class Meta:
        db_table = "gaimification_game_item"
        ordering = ["sort_order", "id"]
        verbose_name = "게임 아이템"
        verbose_name_plural = "게임 아이템"

    def __str__(self) -> str:
        return self.name or f"Item #{self.id} of {self.game_id}"


class TodayPick(TimeStampedModel):
    game = models.ForeignKey(
        Game,
        on_delete=models.CASCADE,
        related_name="today_picks",
        verbose_name="오늘의 추천 게임",
    )
    picked_date = models.DateField(verbose_name="추천 날짜")
    is_active = models.BooleanField(default=True, verbose_name="활성 여부")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="today_picks",
        verbose_name="설정한 관리자",
    )

    class Meta:
        db_table = "gaimification_today_pick"
        ordering = ["-picked_date", "-created_at"]
        verbose_name = "오늘의 추천"
        verbose_name_plural = "오늘의 추천"

    def __str__(self) -> str:
        return f"[{self.picked_date}] {self.game.title}"


# --------------------------------------------------
# GameEditRequest (게임 수정 승인 요청)
# --------------------------------------------------
class GameEditRequestStatus(models.TextChoices):
    PENDING = "PENDING", "승인 대기"
    APPROVED = "APPROVED", "승인"
    REJECTED = "REJECTED", "반려"


class GameEditRequestAction(models.TextChoices):
    SUBMITTED = "SUBMITTED", "요청"
    APPROVED = "APPROVED", "승인"
    REJECTED = "REJECTED", "반려"


class GameEditRequest(TimeStampedModel):
    game = models.ForeignKey(
        Game,
        on_delete=models.CASCADE,
        related_name="edit_requests",
        verbose_name="게임",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="game_edit_requests",
        verbose_name="요청자",
    )
    status = models.CharField(
        max_length=20,
        choices=GameEditRequestStatus.choices,
        default=GameEditRequestStatus.PENDING,
        verbose_name="상태",
    )
    payload = models.JSONField(verbose_name="요청 내용")
    request_prefix = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="요청 파일 prefix",
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_game_edit_requests",
        verbose_name="검토자",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name="검토 시각")

    class Meta:
        db_table = "gaimification_game_edit_request"
        constraints = [
            models.UniqueConstraint(fields=["game", "user"], name="uniq_game_edit_request"),
        ]
        verbose_name = "게임 수정 요청"
        verbose_name_plural = "게임 수정 요청"

    def __str__(self) -> str:
        return f"EditRequest #{self.id} for game {self.game_id}"


class GameEditRequestHistory(TimeStampedModel):
    request = models.ForeignKey(
        GameEditRequest,
        on_delete=models.CASCADE,
        related_name="history",
        verbose_name="요청",
    )
    game = models.ForeignKey(
        Game,
        on_delete=models.CASCADE,
        related_name="edit_request_history",
        verbose_name="게임",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="game_edit_request_history",
        verbose_name="요청자",
    )
    action = models.CharField(
        max_length=20,
        choices=GameEditRequestAction.choices,
        default=GameEditRequestAction.SUBMITTED,
        verbose_name="액션",
    )
    payload = models.JSONField(verbose_name="요청 내용")

    class Meta:
        db_table = "gaimification_game_edit_request_history"
        verbose_name = "게임 수정 요청 기록"
        verbose_name_plural = "게임 수정 요청 기록"

    def __str__(self) -> str:
        return f"EditRequestHistory #{self.id} for game {self.game_id}"


# --------------------------------------------------
# GameChoiceLog (게임 플레이 1회)
# --------------------------------------------------
class GameChoiceLog(TimeStampedModel):
    game = models.ForeignKey(
        Game,
        on_delete=models.CASCADE,
        related_name="sessions",
        verbose_name="게임",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="game_sessions",
        verbose_name="유저",
    )

    # 비로그인 식별용
    session_token = models.CharField(
        max_length=64,
        verbose_name="세션 토큰",
        help_text="비로그인 사용자를 위한 랜덤 세션 토큰",
    )

    source = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="유입 경로",
        help_text="direct, banner_top, share_kakao 등",
    )
    referer_url = models.URLField(max_length=255, blank=True, verbose_name="Referer URL")
    user_agent = models.CharField(max_length=255, blank=True, verbose_name="User-Agent")
    ip_address = models.CharField(max_length=45, blank=True, verbose_name="IP 주소")

    started_at = models.DateTimeField(auto_now_add=True, verbose_name="시작 시각")
    finished_at = models.DateTimeField(null=True, blank=True, verbose_name="종료 시각")

    class Meta:
        db_table = "gaimification_game_choice_log"
        ordering = ["-started_at"]
        verbose_name = "게임 선택 로그"
        verbose_name_plural = "게임 선택 로그"

    def __str__(self) -> str:
        return f"Session #{self.id} for game {self.game_id}"


# --------------------------------------------------
# WorldcupPickLog (토너먼트 선택 로그)
# --------------------------------------------------
class WorldcupPickLog(models.Model):
    choice = models.ForeignKey(
        GameChoiceLog,
        on_delete=models.CASCADE,
        related_name="choices",
        verbose_name="게임 세션",
    )
    game = models.ForeignKey(
        Game,
        on_delete=models.CASCADE,
        related_name="choice_logs",
        verbose_name="게임",
    )

    left_item = models.ForeignKey(
        GameItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="left_choices",
        verbose_name="왼쪽 아이템",
    )
    right_item = models.ForeignKey(
        GameItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="right_choices",
        verbose_name="오른쪽 아이템",
    )
    selected_item = models.ForeignKey(
        GameItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="selected_choices",
        verbose_name="선택된 아이템",
    )

    step_index = models.IntegerField(verbose_name="선택 순서 (0부터 시작)")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성 시각")

    class Meta:
        db_table = "gaimification_worldcup_pick_log"
        ordering = ["choice_id", "step_index", "id"]
        verbose_name = "월드컵 선택 로그"
        verbose_name_plural = "월드컵 선택 로그"

    def __str__(self) -> str:
        return f"Choice #{self.id} (choice {self.choice_id})"


# --------------------------------------------------
# GameResult (최종 결과)
# --------------------------------------------------
class GameResult(models.Model):
    choice = models.OneToOneField(
        GameChoiceLog,
        on_delete=models.CASCADE,
        related_name="result",
        verbose_name="게임 세션",
    )
    game = models.ForeignKey(
        Game,
        on_delete=models.CASCADE,
        related_name="results",
        verbose_name="게임",
    )

    winner_item = models.ForeignKey(
        GameItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="win_results",
        verbose_name="우승 아이템",
    )

    result_title = models.CharField(max_length=100, verbose_name="결과 제목")
    result_code = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="결과 코드",
        help_text="내부적으로 사용하는 코드 (예: TYPE_A 등)",
    )
    result_image_url = models.URLField(
        max_length=255,
        blank=True,
        verbose_name="결과 이미지 URL",
    )

    share_url = models.URLField(
        max_length=255,
        blank=True,
        verbose_name="공유 URL",
    )

    # Postgre + Django 3.1+ 에서는 기본 JSONField 사용 가능
    result_payload = models.JSONField(
        null=True,
        blank=True,
        verbose_name="결과 상세 데이터",
        help_text="점수 breakdown 등 JSON 형태로 저장",
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성 시각")

    class Meta:
        db_table = "gaimification_game_result"
        ordering = ["-created_at"]
        verbose_name = "게임 결과"
        verbose_name_plural = "게임 결과"

    def __str__(self) -> str:
        return f"Result of choice {self.choice_id}"


# --------------------------------------------------
# Banner / BannerClickLog (선택: 광고/유입 분석 용)
# --------------------------------------------------
class BannerPosition(models.TextChoices):
    TOP_GLOBAL = "TOP_GLOBAL", "전체 상단"
    GAME_TOP = "GAME_TOP", "게임 상단"
    # 필요시 추가


class BannerLinkType(models.TextChoices):
    GAME = "GAME", "게임 연결"
    URL = "URL", "URL 링크"


class Banner(TimeStampedModel):
    name = models.CharField(max_length=100, verbose_name="배너 이름(내부용)")
    position = models.CharField(
        max_length=50,
        choices=BannerPosition.choices,
        verbose_name="배너 위치",
    )
    image_url = models.URLField(max_length=255, verbose_name="이미지 URL")
    link_type = models.CharField(
        max_length=20,
        choices=BannerLinkType.choices,
        default=BannerLinkType.URL,
        verbose_name="링크 타입",
    )
    game = models.ForeignKey(
        Game,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="banners",
        verbose_name="연결 게임",
    )
    link_url = models.URLField(max_length=255, blank=True, verbose_name="링크 URL")

    is_active = models.BooleanField(default=True, verbose_name="활성 여부")
    priority = models.IntegerField(default=0, verbose_name="우선순위")

    start_at = models.DateTimeField(null=True, blank=True, verbose_name="노출 시작 시각")
    end_at = models.DateTimeField(null=True, blank=True, verbose_name="노출 종료 시각")

    class Meta:
        db_table = "gaimification_banner"
        ordering = ["-is_active", "-priority", "id"]
        verbose_name = "배너"
        verbose_name_plural = "배너"

    def __str__(self) -> str:
        return f"{self.name} ({self.position})"


class BannerClickLog(models.Model):
    banner = models.ForeignKey(
        Banner,
        on_delete=models.CASCADE,
        related_name="click_logs",
        verbose_name="배너",
    )
    game = models.ForeignKey(
        Game,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="banner_click_logs",
        verbose_name="게임",
    )
    choice = models.ForeignKey(
        GameChoiceLog,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="banner_click_logs",
        verbose_name="게임 세션",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="banner_click_logs",
        verbose_name="유저",
    )

    clicked_at = models.DateTimeField(auto_now_add=True, verbose_name="클릭 시각")
    referer_url = models.URLField(max_length=255, blank=True, verbose_name="Referer URL")
    user_agent = models.CharField(max_length=255, blank=True, verbose_name="User-Agent")
    ip_address = models.CharField(max_length=45, blank=True, verbose_name="IP 주소")

    class Meta:
        db_table = "gaimification_banner_click_log"
        ordering = ["-clicked_at"]
        verbose_name = "배너 클릭 로그"
        verbose_name_plural = "배너 클릭 로그"

    def __str__(self) -> str:
        return f"BannerClick #{self.id} (banner {self.banner_id})"


# --------------------------------------------------
# WorldcupDraft (월드컵 작성 임시 저장)
# --------------------------------------------------
class WorldcupDraft(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="worldcup_drafts",
        verbose_name="유저",
    )
    draft_code = models.CharField(
        max_length=32,
        unique=True,
        db_index=True,
        verbose_name="드래프트 코드",
    )
    draft_prefix = models.CharField(
        max_length=255,
        verbose_name="드래프트 저장 prefix",
        help_text="드래프트 이미지가 저장되는 폴더 prefix",
    )
    payload = models.JSONField(
        null=True,
        blank=True,
        verbose_name="드래프트 payload",
        help_text="작성 중인 데이터(JSON)",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성 시각")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="수정 시각")

    class Meta:
        db_table = "gaimification_worldcup_draft"
        ordering = ["-updated_at"]
        verbose_name = "월드컵 드래프트"
        verbose_name_plural = "월드컵 드래프트"

    def __str__(self) -> str:
        return f"WorldcupDraft #{self.id} (user {self.user_id})"
