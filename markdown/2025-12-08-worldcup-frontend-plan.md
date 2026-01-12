# 2025-12-08 월드컵 선택/상세 페이지 작업 계획

## 목표
- meta/data 응답 포맷을 따르는 FE API 레이어 구축
- 월드컵 선택(배너/목록) 페이지 + 상세 페이지 구현 (모바일 우선, 데스크톱 대응)

## 작업 단계
1) **API/타입 준비**
   - `src/api/http.ts`: Axios 인스턴스, `Meta`, `Pagination`, `ApiResponse<T>` 타입, `requestWithMeta` 헬퍼(`meta.success === false` 시 throw).
   - `src/api/games.ts`: `Topic`, `Game`, `GameDetailData`, `fetchGameDetail(gameId)` → `/api/games/:id` 호출 후 `data` 반환.
2) **라우팅**
   - React Router v6: `/worldcup` → 선택/배너 페이지, `/worldcup/:gameId` → 상세 페이지 연결.
3) **선택/배너 페이지(UI)**
   - 상단 배너/추천 섹션, 카드 그리드(HOT/NEW 뱃지), 카테고리 아이콘 그리드.
   - 모바일 단일 컬럼, 데스크톱 2~4열 그리드로 확장. 더미 데이터로 렌더링.
4) **상세 페이지**
   - `WorldcupDetailPage.tsx`: `useParams`→ `gameId` 파싱, `useEffect`로 `fetchGameDetail` 호출.
   - 로딩/에러/성공 상태 분기, 성공 시 제목/타입/토픽/썸네일 노출.
5) **스타일**
   - 간단한 CSS 모듈/스타일 파일로 반응형 구성, 뱃지 색상(HOT: 노랑, NEW: 민트)과 카드 그림자 적용.
6) **검증**
   - `/worldcup` → 카드 클릭 → `/worldcup/:id` 전환, 에러 응답(meta.success=false) 시 메시지 노출 확인.
