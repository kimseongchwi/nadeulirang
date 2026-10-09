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

상세 `photos` 배열은 공통 API 계약 검사 뒤 `PhotoGallery`에 전달합니다. 대표 우선·수동 넘김/번호/썸네일·방향키/Home/End·모바일 터치를 지원하고 자동 재생은 하지 않습니다. 사진별 실패 상태는 URL로 분리하며 한 장은 넘김 제어 없이, 빈 목록은 종류 아이콘으로 표시합니다. 목록·간단 보기는 `item.photo`를 유지합니다. 상세 iframe은 실제 저장된 갤러리를 보여줍니다.

개발 환경 PC의 UI 가이드 링크는 새 탭으로 열어 기존 조건·스크롤을 유지합니다. 가이드의 후속 하단 버튼은 선택 스타일만 비교하며 실제 북마크·AI 기능을 실행하지 않습니다. 홈 구성/기간 비교는 펼친 상태로 표시하고 14일 채택 기준과 7/30일 비교 옵션을 구분합니다. 원형 심볼 중복 예시는 제거하고 실제 작은 크기·파비콘 예시는 유지합니다.

너비와 기간 비교 셀렉트는 ‘모바일 화면 한눈에 보기’ 오른쪽 위에서 순서대로 사용합니다. 기간은 홈 iframe의 previewDays만 바꾸고 서비스 기본 14일과 검색 조건은 유지합니다. ‘상세 요금·빈 자료’ 예시와 실제 상세 iframe에서 그룹 정렬·복합 요금·주차 독립 행·대시를 확인합니다.

상세 본문 끝의 ‘자료 근거’ 하나에서 자료에 사용한 원천 이름을 중복 없이 확인합니다. 원문·관측·시각은 DB/API에 보존합니다. 푸터 모달과 /policy/about은 공통 출처·필수 귀속·이용 조건을 제공합니다. 갤러리는 이미지 자체의 모서리를 둥글게 표시하며 썸네일 줄은 손가락·마우스로 잡아 끌거나 트랙패드·키보드로 뒤쪽 사진까지 이동합니다. 가이드 Wikimedia 귀속은 /policy/about?sample=clayarch입니다. 사진별 DB/API 계약과 원문은 그대로 유지합니다. 빈 자료는 짧은 대시·15px·600·보조색으로 표시하고 화면 낭독은 미확인입니다. 가이드의 긴 대시는 비교용입니다. 힌트/최신 정보 확인 필요 예시와 컴포넌트는 제거했으며 조회 오류·재시도는 유지합니다.
