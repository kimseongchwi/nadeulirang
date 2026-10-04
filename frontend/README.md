# 나들이랑 프론트엔드

Next.js + TypeScript 기반 프론트엔드다. 같은 개발 서버의 /ui-design에서 디자인 가이드를, /·/search·/detail/:id에서 검토 화면을 확인한다. 디자인 전체의 확정·실제 제품 API 연결은 아직 완료되지 않았다.

실행·검증 방법과 문서 목록은 [루트 README](../README.md)를 참고한다. 프론트 작업 전 [AGENTS.md](AGENTS.md)의 추가 안내를 확인한다.

## 폴더 구성

| 위치 | 역할 |
|---|---|
| [src/app](src/app/) | URL별 page.tsx, 공통 layout.tsx, 파비콘 icon.ts |
| [src/components/ui](src/components/ui/) | 공통 팝업·아이콘·로딩/빈 결과/오류 안내 |
| [src/components/layout](src/components/layout/) | 헤더·하단 메뉴·전체 배치와 뒤로 가기 제목 |
| [src/features/outings](src/features/outings/) | 홈·검색·상세·카드·홈 필터·날짜/검색 처리·검토 데이터 |
| [src/features/policies](src/features/policies/) | 정책 본문·페이지·링크·바텀시트 |
| [src/features/ui-design](src/features/ui-design/) | UI 디자인 가이드·달력 검토 예시 |
| [src/config](src/config/) | 공통 브랜드색 설정 |
| [src/providers](src/providers/) | 화면 간 필터·검토 설정·이동/복귀 상태 |
| [src/styles](src/styles/) | 공통 화면 스타일 |
| [public/images](public/images/) | 이미지 원본과 사진 출처·이용허락 안내 |
| [tests](tests/) | 날짜 경계·검색 조건 테스트 |

app의 page.tsx가 features의 화면을 불러오고, 각 화면은 components의 공통 UI를 사용한다. 가이드의 모바일 미리보기도 같은 홈·검색·상세 페이지를 사용한다. components·features 같은 폴더 이름은 이 프로젝트의 역할 분류이며 Next.js의 필수 이름이 아니다.

[brand.ts](src/config/brand.ts)의 팔레트를 [ReviewShell](src/components/layout/site-shell.tsx)의 CSS 변수와 [icon.ts](src/app/icon.ts)의 파비콘 응답이 공유한다. public/images의 파일은 /images/... 주소로 제공한다. 검토 스냅샷은 [review-data.json](src/features/outings/data/review-data.json)에 보관하며 조회 API 연결은 P12·P13에서 이어간다.
