# 나들이랑 프론트엔드

실행·검증·BACKEND_URL 설정은 [루트 README](../README.md), 추가 규칙은 [AGENTS](AGENTS.md)를 따릅니다.

## 폴더 구성

| 위치 | 역할 |
|---|---|
| src/app | URL별 서버 page.tsx·layout·loading·route·icon과 페이지 옆 전용 화면 |
| src/components/ui | 팝업·시트 핸들·아이콘·로딩/빈 결과/오류/힌트 |
| src/components/layout | SiteShell·헤더/푸터·이동 로딩·본문 스크롤·뒤로 가기 |
| src/features/outings | 공유 카드/간단 보기·홈 필터·타입·URL/API 처리·상세 텍스트/근거 |
| src/features/policies | 공유 정책 본문·링크·시트 |
| src/features/ui-design | 가이드·검토 달력·개발 표시·표본 데이터 |
| src/providers | NavigationProvider의 필터·URL/이력/스크롤·시트 상태 |
| src/config·src/styles | 공통 브랜드 값·service.css |
| public/images | 현재 로고/심볼·가이드 사진·이용허락 |
| tests | 날짜/요금/텍스트·API/URL·시트 경계 회귀 |

page.tsx는 URL 조건·서버 데이터·제목을 처리하고 [home-screen.tsx](src/app/home-screen.tsx)·[search-screen.tsx](src/app/search/search-screen.tsx)·[detail-screen.tsx](src/app/detail/[id]/detail-screen.tsx)·[policy-screen.tsx](src/app/policy/[type]/policy-screen.tsx)가 전용 UI를 담당합니다. 범용 UI와 여러 화면/가이드가 사용하는 나들이 기능만 공유합니다.

## 서버와 브라우저

서버 페이지는 api-server.ts를 통해 Spring을 조회합니다. 간단 보기의 브라우저 요청은 같은 출처 /api/outings/:id로 중계해 서버 전용 BACKEND_URL을 사용합니다. 양쪽은 api-request.ts의 응답/실패 검사와 api-contract.ts를 공유합니다. 정상 0건·400·404·503을 구분하고 장애를 표본으로 채우지 않습니다.

NavigationProvider는 직접 이동의 상단/본문 포커스, 이력 이동의 위치 복원, 같은 페이지 시트의 포커스/스크롤 복귀를 구분합니다. 기존 탭의 sessionStorage/history 키는 호환성을 위해 유지합니다. 의미·선택 이유는 [LEARNING](../docs/LEARNING.md#프론트-파일과-실행-흐름)을 참고합니다.

## UI 가이드 확인

같은 Next.js 서버의 /ui-design에서 공유 컴포넌트·상태·달력·페이지네이션과 320/390/430px iframe을 확인합니다. iframe은 실제 홈/검색/상세이므로 백엔드가 필요합니다. [review-data.json](src/features/ui-design/data/review-data.json)은 가이드 카드 전용 표본이며 서비스 조회와 분리합니다. 달력은 검토 도구이고 첫 공개 필터가 아닙니다.

[brand.ts](src/config/brand.ts)의 팔레트를 SiteShell CSS 변수와 icon.ts가 공유합니다. 사진·로고 원본과 이용 조건은 [IMAGE-CREDITS](public/images/IMAGE-CREDITS.md), 적용/미정 기준은 [DESIGN](../DESIGN.md)을 따릅니다. 가이드 링크는 개발 환경 PC 안내에서만 표시합니다.
