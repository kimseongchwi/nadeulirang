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
| src/features/notices | 실제 공지 콘텐츠·게시일 표시·목록 정렬/조회 |
| src/features/ui-design | 가이드·달력·개발 표시·표본 데이터 |
| src/providers | NavigationProvider의 필터·URL/이력/스크롤·시트 상태 |
| src/config·src/styles | 브랜드 값·service.css의 순서별 스타일 조합·사진/인증 스타일 |
| public/images | 현재 로고/심볼·가이드 사진·이용허락 |
| tests | 날짜/요금/텍스트·API/URL·시트 경계 회귀 |

page.tsx는 URL 조건·서버 데이터·제목을 처리하고 옆 화면 파일이 페이지 전용 UI를 담당합니다. 범용 UI와 여러 화면/가이드가 사용하는 나들이 기능만 공유합니다.

`service.css`는 shared → guide → feedback → outings → information-pages 순서로 불러옵니다. 공통 UI의 뒤쪽 보정까지 기존 순서로 유지하므로 선택자를 다른 파일로 옮길 때 우선순위도 확인합니다. `guide.tsx`는 전체 가이드와 공유 너비/메시지를, `detail-examples.tsx`는 상세 표시 표본을, `state-examples.tsx`는 상태 예시와 위치 선택을 담당합니다.

## 공개 SEO 설정 (P14)

페이지별 색인·대표 주소 기준은 [PRD](../docs/PRD.md#검색-유입과-공개-확인)를 따릅니다. 서버 전용 `SITE_URL`에 실제 HTTPS 도메인의 원점 주소를 넣고 `SITE_INDEXABLE=true`와 `NODE_ENV=production`이 모두 충족되어야 색인을 허용합니다. 하위 경로·인증정보·쿼리·로컬 주소·별도 포트를 가진 주소와 누락된 설정은 색인을 열지 않습니다. 환경 양식은 [.env.example](.env.example)을 따릅니다. 검토용 배포는 `SITE_INDEXABLE`을 비워 두고, 공개용 값은 빌드와 실행에서 동일하게 준비합니다. Next 설정의 HTTP 헤더는 빌드 결과에도 포함되므로 공개 허용/주소 변경 시 다시 빌드합니다. 로컬 인증/DB 설정을 공개 환경으로 복사하지 않습니다.

`src/config/seo.ts`는 공개 환경 판정·메타태그·절대 canonical을 공유합니다. `robots.ts`는 API 경로만 수집 제외하고 페이지의 noindex를 읽을 수 있게 합니다. 비공개 환경은 모든 페이지의 메타태그/HTTP 헤더를 검색 제외로 유지하며 사이트맵 주소를 광고하지 않습니다. `/sitemap.xml`은 기본 안내 주소와 현재 공개 상세만 반환하고, 비공개 환경에서는 DB 조회 없이 빈 목록을 반환합니다. 공개 목록 조회 실패·불일치는 503/no-store/Retry-After로 응답합니다. 실제 도메인 확인·수집/색인 결과는 P15에서 검증합니다.

상세는 `detail-data.ts`를 layout·메타데이터·page가 공유합니다. layout이 `loading.tsx` 바깥에서 존재 여부를 먼저 확인해 직접 HTTP 요청의 404를 보존합니다. 메타데이터 스트리밍도 비활성화해 브라우저/크롤러의 제목·검색 설정을 응답 전에 결정합니다. 최초 HTML은 공개 조회를 기다리며, 앱 안의 이동에는 기존 공통 로딩을 유지합니다. 같은 서버 렌더의 동일 조회는 React cache로 재사용하고 요청을 넘어 실패 결과를 저장하지 않습니다. HTML 조회 실패 화면은 200/noindex·재시도이며 `/api/outings/:id`와 사이트맵의 조회 실패는 503입니다.

## Vercel 개인 검토 배포 (P15)

2026-10-26 공식 조건 확인 기준입니다. [Hobby](https://vercel.com/docs/plans/hobby)는 개인 비상업 용도에 한정되며 [공정 이용 기준](https://vercel.com/docs/limits/fair-use-guidelines)은 광고도 상업 이용으로 분류합니다. 이번 연결은 광고 없는 개인 검토이며 공개 수익화 환경의 선정이 아닙니다. 유료 전환·Pro 체험·결제수단 등록·도메인 구매·유료 부가 기능을 진행하지 않습니다.

Hobby 포함량은 데이터 전송 100GB, 원본 전송 10GB, 함수 호출 100만 회, Active CPU 4시간, Provisioned Memory 360GB-hours입니다. 한도 초과 시 대체로 30일 경과까지 기능이 제한되며 추가 사용량 구매는 지원하지 않습니다. 유료 플랜·유료 부가 기능·도메인은 별도 비용 조건을 확인해야 합니다. 무료 조건은 변경될 수 있으므로 재연결 전에 공식 문서와 계정 Usage를 확인합니다.

| 설정 | 검토 환경 값 |
|---|---|
| 프로젝트 | `nadeulirang-review` |
| Framework Preset | Next.js, 현재 저장소 버전 16.4.3 |
| Root Directory | `frontend` |
| Node.js Version | `24.x` |
| Install / Build Command | `npm ci` / `npm run build` |
| Output Directory | Next.js 기본값, 별도 덮어쓰기 없음 |
| `SITE_INDEXABLE` | Preview·Production 모두 `false` |
| `SITE_URL` | 검토 중 미설정, 공개 대표 주소를 지정하지 않음 |
| `BACKEND_URL` | 외부 Spring의 HTTPS 원점을 확보한 뒤 필요한 배포 환경에만 설정 |

[빌드 설정](https://vercel.com/docs/builds/configure-a-build)을 따르며 Root Directory가 이미 frontend이므로 빌드 명령에 `--prefix frontend`를 추가하지 않습니다. 이 앱은 SSR·동일 출처 API 중계가 필요하므로 정적 export나 `out` 디렉터리를 사용하지 않습니다. Vercel의 Production 표시는 이 검토 프로젝트의 배포 분류이며 서비스의 공개 운영 완료를 뜻하지 않습니다.

검토 주소: [나들이랑 Vercel 검토](https://nadeulirang-review-kimseongchwis-projects.vercel.app/). Vercel Authentication 보호를 유지하므로 소유자의 Vercel 로그인 권한이 필요합니다. noindex는 검색 제외이고 접근 인증을 대신하지 않습니다. 주소를 확인하려고 임시 공유 링크나 보호 우회 토큰을 자동 생성하지 않습니다.

Vercel 함수의 localhost는 Vercel 실행 환경입니다. `BACKEND_URL`을 비우면 현재 코드의 로컬 기본값으로 조회가 실패하며, 로컬 PC의 데이터를 볼 수 없습니다. 이 단계의 성공은 프론트 빌드·HTTPS 주소·실패/재시도 화면·noindex 확인입니다. 외부 백엔드·DB와 실제 데이터가 연결되어야 홈·검색·상세의 정상 조회를 완료했다고 판단합니다. 연결 순서는 [백엔드 검토 환경](../backend/README.md#외부-springpostgresql-검토-환경-p15)을 따릅니다.

`BACKEND_URL`은 서버 전용이며 `NEXT_PUBLIC_`로 만들지 않습니다. DB/원천 키·OAuth·로컬 `.env`·홈 공통 설정을 Vercel로 복사하지 않습니다. 로그인은 이번 검토에서 검증하지 않으며 인증 환경변수도 추가하지 않습니다. 서버 주소나 색인 설정을 변경하면 재배포하고 실제 주소에서 다음을 확인합니다.

1. 홈·검색·공개 상세의 SSR 내용/사진·간단 보기 중계와 페이지 이동·뒤로가기 복귀.
2. 정상 0건과 없는 상세 404, 백엔드 장애 시 HTML 200/noindex·재시도와 `/api/outings/:id` 503 구분.
3. 메타태그·`X-Robots-Tag`의 noindex, 검토 사이트맵의 빈 목록, 비로그인 요청의 Vercel 접근 보호.
4. 절전 뒤 첫 실패와 백엔드 기동 후 재시도 성공. 느린 기동을 정상 0건으로 표시하지 않음.

## 서버와 브라우저

서버 페이지는 api-server.ts를 통해 Spring을 조회합니다. 간단 보기의 브라우저 요청은 같은 출처 /api/outings/:id로 중계해 서버 전용 BACKEND_URL을 사용합니다. 양쪽은 api-request.ts의 응답/실패 검사와 api-contract.ts를 공유합니다. 정상 0건·400·404·503을 구분하고 장애를 표본으로 채우지 않습니다.

NavigationProvider는 직접 이동의 상단/본문 포커스, 이력 이동의 위치 복원, 같은 페이지 시트의 포커스/스크롤 복귀를 구분합니다. 기존 탭의 sessionStorage/history 키는 호환성을 위해 유지합니다. 의미·선택 이유는 [LEARNING](../docs/LEARNING.md#프론트-파일과-실행-흐름)을 참고합니다.

## UI 가이드 확인

같은 Next.js 서버의 /ui-design에서 기본 스타일·공통 UI·실제 화면·검토 중의 4개 구역을 확인합니다. 목차는 같은 구역으로 나누고 세부 항목은 필요할 때 펼칩니다. 웹 적용 기준·공유 UI 표본과 채택한 하단바·달력 스타일·현재 화면과 확정 광고 배치·남은 기능/검증 상태를 구분하며 기존 구역의 해시 링크를 유지합니다. 공유 컴포넌트·상태·달력·페이지네이션과 320/390/430px iframe을 제공합니다. 실제 화면은 홈/검색/상세·내정보/로그인/FAQ/공지사항 중 선택한 하나만 iframe으로 표시하고 새 탭으로 열 수 있습니다. 찾을 수 없는 페이지는 공통 UI의 불러오기 실패 오른쪽에 상태 표본으로 표시하며 실제 404 라우트는 유지합니다. 나들이 조회 화면은 백엔드가 필요합니다. [review-data.json](src/features/ui-design/data/review-data.json)은 가이드 카드 전용 표본이며 서비스 조회와 분리합니다. 달력 스타일은 공통 UI에서 확인하며 실제 낭독·기기 검증과 첫 공개 이후 날짜 필터 도입은 별도입니다.

`/ui-design#ad-placement`의 ‘광고 위치’에서는 현재 DB의 공개 목록 첫 페이지와 광고 자리 미리보기를 함께 확인합니다. 서버 페이지가 기존 목록 API 결과를 가이드에 전달하므로 백엔드가 필요하며 실패를 표본으로 대체하지 않습니다. 현재 배치는 확정된 UI 기준이며 별도 섹션 대신 서비스 미리보기 안에서 홈 등 선택 화면 오른쪽에 표시합니다. 서비스/광고는 같은 너비 선택을 사용하고 좁은 화면에서는 순서대로 쌓입니다. 배치 기준은 [DESIGN의 P85](../DESIGN.md#목록-중간-광고-위치-미리보기--p85)를 따릅니다. 실제 홈/검색의 광고 삽입과 SDK 연동은 별도 작업입니다.

[brand.ts](src/config/brand.ts)의 팔레트를 SiteShell CSS 변수와 icon.ts가 공유합니다. 가이드 사진 귀속은 [IMAGE-CREDITS](public/images/IMAGE-CREDITS.md), 로그인 리소스 근거는 [DESIGN](../DESIGN.md#로그인-화면-검토--p30), 적용/미정 기준은 [DESIGN](../DESIGN.md)을 따릅니다. 가이드 링크는 개발 환경 PC 안내에서만 표시합니다.

상세 `photos` 배열은 공통 API 계약 검사 뒤 `PhotoGallery`에 전달합니다. 대표 우선·수동 넘김/번호/썸네일·방향키/Home/End·모바일 터치를 지원하고 자동 재생은 하지 않습니다. 사진별 실패 상태는 URL로 분리하며 한 장은 넘김 제어 없이, 빈 목록은 종류 아이콘으로 표시합니다. 목록·간단 보기는 `item.photo`를 유지합니다. 상세 iframe은 실제 저장된 갤러리를 보여줍니다.

다가오는 구간은 내일부터 14일로 고정하며 사용자/가이드의 기간 숫자 안내·비교 제어·비교 iframe은 제거했습니다. 홈의 기존 previewDays는 기간을 바꾸지 않고 검색의 기존 7/30일 검토 주소/폼도 14일로 조회합니다. 사용하지 않는 기간 상태는 Provider에서 제거했으며 기존 탭의 저장 값은 삭제하지 않습니다. 가이드의 너비·상세 표본·확정 하단바 선택 상태는 [현재 화면 기준](../DESIGN.md#현재-적용한-화면-기준)을 따릅니다. 실제 서비스와 같은 공유 UI를 사용하며 새 디자인·후속 기능을 자동 채택하지 않습니다.

## 내정보·FAQ·공지사항

`/mypage`는 내정보 안내 화면, `/faq`는 현재 기능의 문답, `/notices`와 `/notices/[id]`는 공지 목록/상세입니다. 이 페이지들은 원천 API나 DB를 조회하지 않습니다. 내정보는 로그인 진입과 공지사항·FAQ·설정을 표시하며 설정은 항상 마지막 항목입니다. `/settings`는 기존 정책/출처 시트를 목록으로 열고 공통 푸터 접근도 유지합니다. 설정의 직접 접속 뒤로가기는 내정보로 복귀하고 검색 제외·하단 내정보 선택 상태를 유지합니다.

FAQ 문답은 [faq-screen.tsx](src/app/faq/faq-screen.tsx), 실제 게시할 공지는 [model.ts](src/features/notices/model.ts)의 `notices`에 등록합니다. 공지는 변경하지 않는 양의 정수 `id`, 제목, 서울 기준 게시일 `YYYY-MM-DD`, 일반 텍스트 문단 배열을 사용합니다. 목록은 최신 게시일 순·같은 날짜의 ID 역순이며 등록된 글이 없으면 빈 상태, 없는 상세는 404입니다. 상세 하단은 목록과 이전(오래된)/다음(새로운) 글을 연결하며 인접 글이 없으면 안내만 표시합니다. ID를 바꾸거나 재사용하지 않습니다. 실제 운영 공지의 내용은 P15에서 확인하며 공개용 예시 글은 넣지 않습니다. 관리자·북마크 저장·사용자 환경 설정은 후속입니다. 제품·화면 기준은 PRD·DESIGN을 따릅니다.

## 회원 인증 — P30

/login은 카카오·네이버·구글 소셜 로그인 전용 화면입니다. 상단 로그인/내정보와 UI 가이드에서 접근하며 공개 환경에서도 noindex입니다. 이메일/비밀번호·가입·인증/복구 폼은 제공하지 않습니다. 별도 계정 관리 화면과 진입 링크는 제거했습니다. 로그인한 회원에게는 닉네임과 나들이 둘러보기를 표시합니다. 제목 위 브랜드·준비/가입/초기 조회 안내와 재시도 버튼은 생략하며 실제 로그인 실패 안내·정책 동의·미설정 제공자 비활성화는 유지합니다. 버튼 원본/색상·폰트 기준은 [DESIGN](../DESIGN.md#로그인-화면-검토--p30)을 따르며 디자인은 검토 중입니다.

features/auth/proxy.ts와 /api/auth/[...path]는 소셜 인증·회원/세션의 허용 경로만 중계하며 기존 자체 인증 경로는 404로 차단합니다. 브라우저에 BACKEND_URL/secret을 보내지 않고 세션 쿠키·CSRF만 전달합니다. 제공자 리다이렉트는 브라우저 전체 이동이며 OAuth 결과는 /login#completed 또는 /login#error로 돌아오고 표시 후 fragment를 제거합니다. 프론트 AUTH_PUBLIC_ORIGIN은 백엔드와 같아야 합니다.

회원 응답은 fetch/no-store와 브라우저 메모리로 관리하며 서버 캐시·NavigationProvider·sessionStorage에 회원/토큰을 저장하지 않습니다. 변경마다 CSRF를 새로 읽습니다. 설정된 제공자만 사용 가능하며 최초 가입 동의와 기존 회원 로그인을 구분합니다. API·설정·실제 연동 상태는 [백엔드 회원 인증 안내](../backend/README.md#회원-인증-api--p30)를 따릅니다.
