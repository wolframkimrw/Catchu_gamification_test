# 심리테스트 제작 (프론트 저장 버전)

## 목적
- 월드컵 만들기와 같은 흐름으로 심리테스트를 제작할 수 있도록 한다.
- 저장은 우선 프론트 JSON 파일로 하며, 추후 DB 이관을 고려한다.

## 사용 경로
- 제작 페이지: `/psycho/create`
- 결과 확인: `/psycho/<slug>`

## 저장 흐름
1) `/psycho/create`에서 입력값을 작성한다.
2) 저장 시 백엔드 `POST /games/psycho/templates/` 호출
3) 아래 두 위치에 JSON 저장됨
   - `data/json/psycho/<slug>.json`
   - `frontend/src/utils/psycho/<slug>.json`

## 주요 필드
- `title`: 테스트 제목 (slug 자동 생성에 사용)
- `description`: 시작 화면 설명
- `thumbnail_url`: 시작 화면 썸네일 이미지(파일 업로드 → 저장 시 URL로 기록)
- `scoring`: 점수 규칙 정보 (가중치 방식 기준)
- `cards`: 결과 카드 목록
  - `id`, `label`, `summary`, `keywords`
  - `image_url`: 결과 카드 이미지(선택)
- `questions`: 질문 목록
  - `id`, `text` (질문 텍스트)
  - `options`: 문단 목록
    - `id`, `text`
    - `image_url`: 문단 이미지(선택)
    - `weights`: `{ cardId: number }` 점수 매핑

## 입력 이유 (요약)
- 제목/설명/썸네일: 시작 화면과 리스트 노출을 위한 기본 정보.
- 태그: 게임 분류/검색/카드 노출에 활용.
- 결과: 최종 결과 화면에 표시될 카드 정보.
- 질문/문단: 실제 플레이 흐름(질문 → 문단 선택).
- 점수/결과 연결: 문단 선택 결과가 어떤 결과로 이어지는지 결정.

## 화면 반영
- 시작 화면: `thumbnail_url`이 있으면 이미지로 표시
- 문단: `image_url`이 있으면 썸네일과 텍스트를 함께 표시
- 결과 카드: `image_url`이 있으면 해당 이미지로 카드 표시

## 입력 UI
- 썸네일 입력만 박스 유지
- 제목/설명/태그 입력은 박스 제거

## 참고 사항
- 이미지 입력은 파일 선택 기준이며, 저장 시 URL 문자열로 기록된다.
- `fetchGamesList`에서 slug와 매칭되는 게임이 있으면 결과 로그에 연동된다.
