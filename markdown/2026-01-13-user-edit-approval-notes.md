# 유저 수정 승인 메모

## 요청 요약
- 메뉴에서 스태프는 `관리자`, 일반 유저는 `내 게임 수정` 탭 노출.
- 유저 수정은 즉시 반영되지 않음.
- 유저 수정 시 승인 요청이 생성되어 관리자에게 전달됨.
- 관리자가 승인하면 변경사항이 그대로 반영됨.

## 확인 필요한 범위
- 수정 가능 항목: 제목/설명/썸네일/아이템 전부 허용.
- 승인 요청 처리 방식: 마지막 요청으로 덮어쓰기(대기 1건), 히스토리는 기록만 유지.
- 관리자 UI: 기존 관리자 페이지에 “승인 요청” 목록 추가.
- 알림 방식: 보류 (추후 결정).

## API 메모 (초안)
- 유저 수정 요청: `POST /api/games/edit-requests/`
  - 필드: `game_id`, `title`, `description`, `thumbnail|thumbnail_url`
  - 아이템: `items[i].id`, `items[i].name`, `items[i].image|items[i].image_url`
- 관리자 목록: `GET /api/games/admin/edit-requests/`
- 관리자 승인/반려: `POST /api/games/admin/edit-requests/approve|reject/` (request_id)
