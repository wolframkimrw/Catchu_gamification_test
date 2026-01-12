# 월드컵 & 게이미케이션 서비스 (Gamification Platform)

## 개요

이 서비스는 **월드컵 / 운세 / 테스트 / 퀴즈** 등 다양한 게임을 제공하여  
유저를 즐겁게 참여시키고, 이를 통해 **쇼핑앱으로 유입**시키는 것을 목표로 합니다.


## 주요 목적
1. **게이미피케이션으로 사용자 확보**
2. **쇼핑 서비스로 전환 유도 (배너/연동 기능)**


### 시스템 구조 요약

| 구성 요소 | 역할 | 확장 가능성 |
|---|---|---|
| Game | 게임 정의(설계도) | 월드컵/테스트 모두 가능 |
| GameItem | 게임 내 콘텐츠 (이미지/보기) | UGC 대응 |
| WorldcupTopic | 월드컵 카테고리 | UI/노출 제어 |
| GameSession | 1회 플레이 기록 | 쇼핑 전환 분석 |
| GameChoiceLog | 선택 로그 | 승률/이탈 분석 |
| GameResult | 최종 결과 저장 | 공유 URL 기반 |
| Banner | 상단 배너 | 쇼핑 유입 버튼 |
| BannerClickLog *(Optional)* | 배너 클릭 분석 | 마케팅 최적화 |


## ERD (관계 구조)

worldcup_topic (1) ── (N) game (1) ── (N) game_item
│
├── (N) game_session (1) ── (N) game_choice_log
│
└── (N) game_result

banner (optional) ── (N) banner_click_log


## DB 스키마 개요

### worldcup_topic
- 월드컵 카테고리 (라면 / 게임 / 동물…)

| 컬럼 | 설명 |
|---|---|
| name | 주제명 |
| slug | URL 식별자 |
| sort_order | 노출 순서 |
| is_active | 표시 여부 |


### game
- 모든 게임을 아우르는 **마스터 데이터**
- `type`으로 월드컵/운세/퀴즈 구분

| 주요 필드 | 설명 |
|---|---|
| type | `WORLD_CUP` / `FORTUNE_TEST` / `QUIZ` |
| parent_topic_id | 월드컵 주제(FK) |
| created_by_user_id | 운영자 / 유저 |
| storage_prefix | 해당 게임 전용 이미지 폴더 |
| visibility / status | 노출 제어 |


### game_item — 콘텐츠(이미지/보기)

| 주요 필드 | 설명 |
|---|---|
| game_id | 어느 게임 것인지 |
| name | 후보명 (선택) |
| file_name | 실제 이미지 파일명 |
| sort_order | 초기 정렬 |
| is_approved / is_blocked | 운영 심사 제어 |

---

### game_session — 플레이 단위

| 필드 | 설명 |
|---|---|
| user_id / session_token | 로그인/비로그인 구분 |
| started_at / finished_at | 실행 이력 |

---

### game_choice_log — 선택 기록

- 월드컵: `left_item_id`, `right_item_id`, `selected_item_id`
- 운세/테스트: `question_id`, `option_id`

| 필드 | 설명 |
|---|---|
| session_id | 플레이 참조 |
| step_index | N번째 선택 |

---

### game_result — 최종 결과

| 필드 | 설명 |
|---|---|
| winner_item_id | 월드컵 우승 이미지 |
| result_title | 결과 문구 |
| result_payload | JSON (점수/상세 데이터) |

---

### (OPTIONAL) banner / banner_click_log
- 쇼핑앱 유입 트래킹 용
- MVP에서는 로그 생략 가능

---

## 동작 플로우

```mermaid
flowchart TD
A[주제 조회: worldcup_topic] --> B[게임 목록 조회: game]
B --> C[게임 상세 + 후보 조회: game_item]
C --> D[게임 시작: game_session 생성]
D --> E[라운드마다 선택: game_choice_log 저장]
E --> F[결과 계산: game_result 저장]
F --> G[결과 공유/노출 + 쇼핑 연동]
