# 백엔드

Spring Boot·Java 21·Spring Data JPA·Hibernate·PostgreSQL을 사용합니다. 실행·검증은 [루트 README](../README.md#백엔드-실행검증)를 따릅니다.

## 구조

- collection/: 원천 HTTP 클라이언트·수동 실행기, 호출/원천/커서 JPA 모델과 Repository, 근거·충돌을 조율하는 CollectionStore.
- outing/: 요청 조건·컨트롤러·SQL 조회·응답 record·오류 처리. 엔티티는 외부에 노출하지 않습니다.
- auth/: 회원·소셜 OAuth2/OIDC·최근 재인증·DB 세션/권한 경계와 동일 출처 중계용 API.
- resources/db/migration/: Flyway V1~V8. 기존 적용 파일은 수정하지 않습니다. Hibernate ddl-auto=validate·open-in-view=false로 자동 DDL·요청 밖 추가 조회를 막습니다.
- src/test/: UUID 격리 PostgreSQL의 API·수집·JPA/SQL 공동 트랜잭션 회귀와 순수 정책 테스트.

CollectionRunner는 실행 방식을 조율하고 일반 상세/보완의 응답 저장을 공유합니다. CollectionStore의 자료 연결 변경은 양쪽 날짜/요금 요약도 같은 트랜잭션에서 갱신합니다. 원문·연결 이력은 보존하며 호출·커서·행 저장의 트랜잭션을 합치지 않습니다. 개념과 실제 흐름은 [LEARNING](../docs/LEARNING.md#데이터-모델과-수집-코드)을 참고합니다.

JPA는 원천 상태·호출 기록·커서의 단순 저장/조회를 담당합니다. 커서 최초 생성의 ON CONFLICT, 원문/근거 upsert·최신 선택·충돌과 공개 조회는 SQL을 유지합니다. FK는 ID로 연결해 연쇄 조회·삭제를 추가하지 않습니다. 역할과 어노테이션 설명은 [LEARNING](../docs/LEARNING.md#jpa-저장과-트랜잭션)을 참고합니다. 수집 원천·예산·보존/갱신 기준은 [DATA_SOURCES](../docs/DATA_SOURCES.md#p11-수집-기준)에 있습니다.

## 회원 인증 API — P30

브라우저는 Next.js의 /api/auth/*로 Spring 인증을 중계합니다. 로그인 화면은 /login이며 검색/상세는 익명 이용을 유지합니다. 별도 계정 관리 화면은 제공하지 않습니다. 오류는 code·한국어 message·retryable, 인증 응답은 no-store입니다.

| 메서드·/api/auth/ 뒤 경로 | 요청·동작 |
|---|---|
| GET csrf / options | CSRF 토큰 / 설정된 제공자·정책 버전 |
| GET me | UUID·닉네임·역할·상태·소셜 수단. 제공자 ID/토큰/이메일 제외 |
| POST oauth/{provider}/start | kakao/naver/google·mode,termsVersion?,privacyVersion?; login/link/reauth/unlink/withdraw. 반환된 동일 출처 redirect로 이동 |
| GET oauth2/authorization/{provider} / login/oauth2/code/{provider} | 시작 세션·5분·state 검증, 구글 OIDC의 서명·issuer·audience·nonce 검증 |
| POST logout / sessions/end-all | 현재 / 전체 기기 세션 종료 |
| PATCH admin/users/{UUID} | ADMIN 최근 재인증 + role/status; 기존 세션 회수. 관리자 화면은 후속 |

이메일 가입/로그인·인증/재발급·비밀번호 변경/복구·자체 수단 연결/해제 API와 직접 DELETE me는 제공하지 않습니다. Next 중계는 기존 자체 경로를 404로 차단하고 Spring은 denyAll로 차단합니다(익명 401·인증 회원 403). 탈퇴는 소셜 인증 콜백으로만 수행합니다. V1~V7·기존 local_credential/auth_token 행은 보존하고 V8은 oauth_account 제공자 제약에 google만 추가합니다. 이전 자체 계정은 자동 소셜 연결/로그인하지 않습니다.

변경은 먼저 GET csrf에서 세션 쿠키/토큰을 받고 X-CSRF-TOKEN과 JSON을 보냅니다. Next는 AUTH_PUBLIC_ORIGIN과 요청 Origin 일치·허용 경로/제공자 이동·16KiB·세션 쿠키만 전달·수동 redirect를 검사합니다. 세션은 HttpOnly·SameSite=Lax·Path=/이며 HTTPS에서 Secure, 유휴 30분·최대 12시간입니다. 매 요청 회원 상태/역할/auth_version을 검사합니다. 소셜 시작은 백엔드 접속 주소 50회/15분으로 제한하며 중계 주소 공유 한도이고 실제 사용자 IP/WAF는 P15입니다.

소셜 수단은 (provider,subject)·회원별 provider UNIQUE와 회원 행 잠금으로 중복/마지막 수단/동시 변경을 보호합니다. 연결/해제에는 기존 수단의 최근 인증과 제공자 인증을 요구합니다. 카카오는 prompt=login, 네이버는 auth_type=reauthenticate와 토큰 교환 state, 구글은 openid scope·select_account를 사용합니다. 이메일로 합치지 않으며 제공자 access/refresh/ID token은 DB 세션에 보관하지 않습니다. 원격 해제는 카카오 unlink·네이버 revoke·구글 revoke 성공 후 로컬 수단을 제거합니다. 여러 수단이 남은 탈퇴는 OAUTH_DISCONNECT_REQUIRED이며 원격 실패는 로컬 자료를 보존합니다. 원격 성공 뒤 DB 실패는 자동 롤백할 수 없어 재인증/재시도와 연결 상태 확인이 필요합니다.

주요 실패는 400 입력/동의, 401 인증/세션, 403 정지/권한/CSRF/최근 인증, 409 중복/마지막 수단/소셜 해제 필요, 429 한도, 503 제공자/정책/DB입니다. OAuth는 원문 없는 /login#error로 돌아옵니다. 최초 ADMIN은 운영자 확인 후 UUID의 role과 auth_version을 DB에서 변경하며 자동 관리자/기본 비밀번호는 없습니다.

### 외부 설정과 공식 조건

카카오/네이버 공식 조건은 2026-10-11, 구글은 2026-10-13 확인했습니다. 실제 앱 생성·키 등록·심사·실제 제공자 로그인/해제는 미실행입니다. 작업 폴더 .env 양식과 루트 실행 절차를 사용하고 홈 .nadeulirang/.env는 수정하지 않습니다. SMTP·메일 환경은 사용하지 않습니다.

인증 기본 양식은 제공자 키 6개와 정책 버전 2개입니다. 로컬 기본 포트에서 불필요한 AUTH_PUBLIC_ORIGIN·AUTH_SECURE_COOKIE는 루트 .env 양식에서 제외했습니다. 아래 선택 설정은 필요한 환경에서만 직접 추가합니다. 빈 값은 use-auth-env.ps1이 현재 프로세스에 적용하지 않습니다. 별도로 설정한 프로세스 환경 변수가 없으면 코드 기본값을 사용합니다. 실제 값이 적용되는 시점은 README의 서버 실행 절차로 새 프로세스를 시작할 때입니다. 프론트/백엔드의 로컬 기본 주소는 같으므로 기본 포트에서는 별도 frontend/.env.local 생성이 필요하지 않습니다.

| 변수 | 역할·로컬 필요성 |
|---|---|
| AUTH_PUBLIC_ORIGIN | OAuth 콜백과 요청 Origin 검사의 기준 웹 주소. 기본 http://localhost:3000이므로 로컬 기본 포트에서는 생략 가능. 공개 환경은 양쪽 서버에 같은 HTTPS 원점을 명시 |
| AUTH_SECURE_COOKIE | Secure 쿠키의 추가 강제 옵션. 기본 false이고 HTTPS 원점은 자동으로 Secure를 강제하므로 일반 로컬 HTTP에서는 생략 가능 |
| AUTH_TERMS_VERSION | 나들이랑 이용약관의 동의 버전. 소셜 최초 가입 시 user_consent에 기록하며 현재 구현은 빈 버전의 신규 가입을 차단 |
| AUTH_PRIVACY_VERSION | 나들이랑 개인정보 고지의 동의 버전. 제공자 키/제공자 약관 버전과 별개이며 실제 검토한 서비스 문서의 버전을 설정 |

소셜 전용 전환은 DB의 회원/수단 분리 구조를 유지합니다. app_user는 회원, oauth_account는 제공자 연결, user_consent는 버전별 동의, spring_session/attributes는 서버 세션, auth_rate_limit은 현재 소셜 시작 한도입니다. 이전 local_credential과 auth_token은 현재 코드에서 조회/생성하지 않지만 적용된 V7과 기존 자료 보존을 위해 남아 있습니다. 서버 코드를 제거해도 Flyway가 테이블을 자동 삭제하지 않으며, 이번 V8은 구글 제공자 제약만 추가했습니다.

| 대상 | 필요한 설정·확인 | 현재 상태 |
|---|---|---|
| 공통 | 양쪽 AUTH_PUBLIC_ORIGIN 일치, 실제 정책 검토 후 AUTH_TERMS_VERSION/AUTH_PRIVACY_VERSION·HTTPS 쿠키 | 운영 정책 미확정, 미설정 신규 가입 차단 |
| 카카오 | KAKAO_CLIENT_ID/SECRET·로그인 활성화·정확한 /api/auth/login/oauth2/code/kakao Redirect URI | 코드/대체 제공자 검증, 실연동 미실행 |
| 네이버 | NAVER_CLIENT_ID/SECRET·Callback URL·테스터·공개 전 검수 | 코드/state 검증, 실제 테스터/검수 미실행 |
| 구글 | GOOGLE_CLIENT_ID/SECRET·웹 OAuth 클라이언트·정확한 /api/auth/login/oauth2/code/google Redirect URI·동의 화면/테스트 사용자 설정 | openid만 요청, 코드/대체 OIDC 검증과 실연동 구분 |

[카카오 설정](https://developers.kakao.com/docs/ko/kakaologin/prerequisite)·[REST 명세](https://developers.kakao.com/docs/ko/kakaologin/rest-api), [네이버 검수](https://developers.naver.com/docs/login/verify/verify.md)·[API](https://developers.naver.com/docs/login/api/api.md), [구글 서버 OAuth](https://developers.google.com/identity/protocols/oauth2/web-server)·[OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)를 따릅니다. 구글의 이메일/profile 권한은 요청하지 않고 검증한 sub로 회원을 식별합니다.

인증 회귀는 실제 PostgreSQL의 UUID 격리 스키마와 대체 OAuth/OIDC 서버로 수행하며 실제 제공자 연동을 완료했다고 간주하지 않습니다. Spring 보안 근거는 [CSRF](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html)·[세션](https://docs.spring.io/spring-security/reference/servlet/authentication/session-management.html)·[JDBC 세션](https://docs.spring.io/spring-session/reference/configuration/jdbc.html)입니다.

## 목록·상세 조회 API

사진은 허용한 메타데이터와 원문 근거만 저장합니다. 수집·이용 조건은 [DATA_SOURCES](../docs/DATA_SOURCES.md#이용-조건)를 따릅니다.

Spring 서버 실행 후 `http://localhost:8080`에서 아래 읽기 전용 API를 호출합니다. Next.js 서버 페이지와 간단 보기의 상세 중계가 이 API를 사용합니다. 요청마다 원천 API를 호출하지 않고 저장된 PostgreSQL 자료를 읽습니다.

| GET 경로 | 응답 |
|---|---|
| `/api/outings` | `items`·`page`·`pageSize`·`total`·`asOfDate` |
| `/api/outings/home` | 진행 중 `ongoing`·다가오는 `upcoming`·상설 `permanent` 각 최대 3개, 세 구분의 전체 `total`·`days`·`asOfDate` |
| `/api/outings/options` | 현재 일반 목록에 노출 가능한 시도 `regions`와 종류 `kinds`, 각 건수·전체 건수·기준일 |
| `/api/outings/{id}` | `item` 요약·`sources`·항목별 `information`·`links`·`unconfirmed`·기준일 |

목록의 조건은 다음과 같습니다. 예: `/api/outings?region=11&kind=EXHIBITION&period=ONGOING&page=1`.

| 매개변수 | 기본값·허용 값 |
|---|---|
| `keyword` | 빈 문자열. 앞뒤 공백 제거 후 이름 부분 일치, 대소문자 무시, 최대 200자. `%`·`_`도 문자 그대로 검색 |
| `region` | 빈 문자열이면 전체. `/options`의 `regions[].code` 하나, 최대 20자. 알 수 없는 지역 코드는 정상 0건 |
| `kind` | 빈 문자열이면 전체. `FESTIVAL`·`EVENT`·`EXHIBITION`·`MUSEUM`·`CULTURAL_SITE` 중 하나 |
| `period` | `ALL`·`ONGOING`·`UPCOMING`·`PERMANENT`·`UNKNOWN`. 기본 `ALL`. 다가오는 기간의 상한을 임의로 정하지 않고 미래 시작 항목 전체를 조회 |
| `sort` | `DEFAULT`·`NAME`·`START_DATE`·`END_DATE`. 기본 `DEFAULT`는 PRD의 행사 시작일 → 상설 이름 → 미확인 이름 순. `NAME`은 이름 순, `START_DATE`·`END_DATE`는 시작/종료일 순이며 날짜 없는 항목은 뒤. 동률은 이름·UUID로 고정 |
| `page` | 1부터 시작하는 정수. 고정 20개. 마지막을 넘은 페이지는 `items: []`와 전체 `total`을 반환 |
| `days` | 기본 0은 상한 없음. `period=UPCOMING`일 때만 7·14·30 허용. 서울 오늘 다음 날부터 오늘+days까지 시작하는 행사이며 마지막 날을 포함. 전체 건수·페이지를 나누기 전에 적용 |

`/home`은 `region`·`kind`와 `days`(기본 14, 7·14·30)를 받습니다. 채택한 서비스 홈은 14일이며 다른 구간은 가이드의 미리보기 검토에 사용합니다. 진행 중은 종료일 순, 다가오는 구간은 시작일 순, 상설은 이름 순으로 각 3개를 반환합니다. 같은 현재 시각과 읽기 트랜잭션에서 세 구분을 계산하며 `total`은 해당 세 구분의 합계입니다. 일정 미확인·구간 밖 예정 행사는 일반 검색에서 찾을 수 있습니다.

조건은 모두 함께 적용됩니다. 지원하지 않는 매개변수·중복 매개변수·허용하지 않은 종류/기간/정렬·잘못된 페이지는 400입니다. 이름 정렬은 PostgreSQL의 `COLLATE "C"`를 명시해 로컬·CI·배포 DB의 기본 로케일 차이에 영향을 받지 않으며, 언어별 사전식 정렬을 제공하지 않습니다. 방문일·요금 필터는 제공하지 않습니다. 페이지 이동 사이 데이터가 갱신될 수 있으며 영구 스냅샷을 제공하지 않습니다.

검토 승인·표출 허용·이용허락·실제 원문을 확보한 자료만 조회합니다. 일반 목록과 선택지에서 종료·취소는 제외하고, 공개 가능한 기존 상세에서는 `item.period`의 `ENDED`·`CANCELLED`와 출처를 유지합니다. 숨김·검토 대기·출처/이용허락 미확보 자료의 상세는 없는 ID와 동일한 404입니다. 행사 날짜 경계는 요청 시점의 Asia/Seoul 날짜이며 시작일·종료일을 포함합니다. `PERMANENT`는 시설 분류이며 당일 운영 확인을 의미하지 않습니다.

### 상세 근거와 미확인 정보

`item`은 이름·종류·시도·확인된 시군구 `districtName`·기간 상태/시작/종료일·일반 성인 요금 상태/금액·요금 충돌·운영 검증 여부와 수집/원천 확인 시각을 제공합니다. 목록·홈·상세의 공통 요약이 같은 지역 값을 사용합니다. `districtName`은 각 오퍼레이션의 마지막 성공 응답에 있는 `addr1`·`rdnmadr`·`lnmadr` 중 시도 이름 다음 첫 시군구가 하나로 일치할 때만 제공합니다. 누락·충돌은 `null`이며 과거 주소·장소명으로 추정하지 않습니다. 상세 주소·원문 이력은 보존합니다. 금액 `null`은 미확인이며 0원으로 바꾸지 않습니다.

목록·홈·상세의 요약에는 `photo`가 있습니다. 없거나 이용 대상이 아니면 `null`이며, 있으면 `id`·원본 HTTPS `url`·선택적 `thumbnailUrl`·`provider`·`attributionUrl`·`license`(`KOGL1`)·`checkedAt`을 제공합니다. 한국관광공사 이미지 호스트의 정해진 `/cms/resource/` JPG/PNG 주소만 허용하며 임의 호스트·인증 정보·쿼리·제3유형은 연결하지 않습니다. 사진에도 해당 나들이의 공개 검토/표출 경계가 적용됩니다. 브라우저의 이미지 요청은 원천 호스트로 직접 전송되므로 원천 장애 시 프론트 아이콘으로 대체합니다.

상세는 `photos: Photo[]`를 추가 제공합니다. 기존 `item.photo` 형식은 유지하며 `photos[0]`과 같습니다. 기존 활성 대표 우선, 이후 최초 저장 순서·URL·ID 순으로 정렬합니다. 대표가 없으면 검토한 첫 허용 사진을 선택합니다. `photos: []`는 저장된 이용 가능 사진 없음이며 원천 전체에 사진이 없다는 의미가 아닙니다. 실패·시간 초과·정상 0건·공란은 기존 사진과 확인 시각을 유지합니다. 명시적인 유형 변경은 해당 URL만 차단하며 원문은 보존합니다. 추가 사진은 같은 contentid의 `detailImage2` 저장 응답과 대조하고 URL별 관측·이미지 이름·순서를 DB에 보존합니다. 조회는 원천 호출을 하지 않습니다.

`information`은 `address`·`description`·`hours`·`closedDays`·`generalFee`·`extraFee`·`discount`·`reservation`·`officialWebsite`·`contact`·`notes` 배열입니다. 각 원소는 원천 필드명·문장/값·원천/원본 키·출처 URL·원천 기준일/수정 시각·수집/확인 시각·오래됨 여부·`observationId`를 함께 제공합니다. 일반 요금 문장의 조건이나 반복 안내를 자동 가격표로 해석하지 않습니다. `notes`의 `infoname`·`infotext`는 같은 `observationId`로 묶어 제목과 본문을 표시할 수 있습니다. 운영 시간·휴관일·예약 기간은 다른 정보입니다.

화면용 `information`은 V5의 `effective_field_evidence`에서 같은 원천·대상·오퍼레이션·필드의 유효 근거를 선택합니다. 실패·정상 0건·공란·null·필드 누락은 기존 유효 값을 삭제하지 않습니다. 원문을 합성하지 않으며 선택한 값의 실제 `observationId`·출처·기준일·확인 시각을 유지합니다. 빈 상세 응답은 `EMPTY_DETAIL` 재확인 사유를 남깁니다. 각 오퍼레이션 마지막 응답의 빈 값도 `evidence`에 남고 이전 원문은 DB에 보존합니다. 필드의 `stale`은 해당 근거 확인 시각으로 판단하므로 새 성공이 보존 값을 새 사실로 만들지 않습니다. `sources`는 마지막 원문 수집·응답 성공·실패 시각을 구분하며 원천 응답 성공은 현장 운영 보장이 아닙니다.

`unconfirmed`는 값 없는 정보 그룹과 `operation`·`eventDates`·`adultFee` 등 미확인 항목입니다. 수집 문장의 할인 조건을 자동 확정하지 않아 `discountConditions`, 예약 기간을 별도로 검증하지 않아 `reservationPeriod`를 유지합니다. 배열에 없다는 이유만으로 문장의 모든 조건을 검증했다고 해석하지 않습니다.

`links`는 공식 홈페이지/예약 안내 원문의 명시적인 HTTP(S) 주소만 추출하고 근거를 함께 제공합니다. 없는 예약 주소·스킴·예약 가능 여부를 만들지 않습니다. 연결 주소가 없으면 `officialWebsiteLink`·`reservationLink`를 미확인으로 표시합니다. **원천 문장은 신뢰되지 않은 텍스트이므로 화면에서 HTML로 직접 삽입하지 않고 텍스트로 표시합니다.** 이미지·원문 전체·검토 사유·인증/DB 설정은 응답에 포함하지 않습니다.

표준데이터는 같은 `source`+`sourceKey` 안에서 필드별 유효 `YYYY-MM-DD` 기준일을 우선합니다. TourAPI는 응답에 있는 유효한 `modifiedtime`, 기준일 없는 상세는 마지막 유효 응답을 사용합니다. 같은 기준일의 다른 값은 충돌로 남기며 기준일 없는 수집 순서는 사실의 최신성 보장이 아닙니다. 그룹별 표준 안내 우선은 제품의 표시 우선순위이며 교차 원천의 수집 시각·기준일을 비교한 최신 판정이 아닙니다. 교차 원천과 동일 기준일 요금 충돌은 임의로 평균·최저가·합산하지 않습니다. 보존 값은 원래 기준일을 제공하며 필드별로 다른 응답 근거를 사용할 수 있습니다. 반복 안내 제목은 선택한 본문과 같은 관측의 원문으로 연결합니다. 행사 일정 요약도 같은 관측의 유효 시작/종료 쌍을 사용하며 서로 다른 쌍이면 미확인으로 두고 원문을 보존합니다. 누락·잘못된 날짜는 기존 유효 일정을 지우지 않습니다.

선택 후 같은 의미의 필드와 같은 값의 공백 차이를 통합합니다. 평일/휴일·시작/종료·연령별 요금은 구분하고 괄호의 예외·다른 숫자는 지우지 않습니다. 기본 주소가 도로명/지번 주소와 같을 때만 기본 주소의 반복을 생략하며, 같은 전화번호는 교차 연락처 필드에서도 한 번 제공합니다. 같은 값의 대표 근거는 확인 시각이 더 최근인 것으로 정합니다. `evidence`에는 선택 전 표시 대상 필드의 출처별 현재 근거를 빈 값까지 모두 보존합니다. 전체 원문·이전 성공 이력은 DB에 남기며 공개 가능한 필드만 API에 제공합니다. `notes`는 제목/본문 연결을 위해 행 단위를 유지하고, `links`는 목적과 URL이 같은 링크를 한 번만 제공합니다.

`evidence`의 원천 값이 JSON `null`이면 그대로 보존하며, `information`에는 값이 있는 안내만 제공합니다. 빈 문자열·`null`을 0원이나 무료로 바꾸지 않습니다.

| 상황 | HTTP·응답 |
|---|---|
| 정상 결과 없음 | 200, `items: []`, `total: 0` |
| 없는/비공개 상세 | 404, `code: NOT_FOUND` |
| 잘못된 주소/조건 | 400, `code: INVALID_REQUEST` |
| DB 조회·트랜잭션 실패 | 503, `code: QUERY_UNAVAILABLE`, `retryable: true` |

오류 본문은 `code`·한국어 `message`·`retryable`만 제공하며 DB/SQL 오류 원문은 공개하지 않습니다. API 파일은 `src/main/java/kr/nadeulirang/backend/outing/`, HTTP·실제 DB 테스트는 `src/test/java/kr/nadeulirang/backend/outing/OutingApiTests.java`에 있습니다. 개념·호출 흐름은 [학습 문서](../docs/LEARNING.md#목록상세-http-조회와-공개-경계)를 참고합니다.

## 외부 Spring·PostgreSQL 검토 환경 (P15)

Vercel은 Next.js만 실행하며 로컬 PC의 `127.0.0.1:8080`·PostgreSQL에는 접속할 수 없습니다. 2026-10-26 공식 조건을 확인하고 Neon·Render의 별도 무료 검토 환경을 준비합니다. 계정 로그인·약관·GitHub 권한 동의는 사용자가 직접 처리하며 카드 등록·유료 체험·유료 전환·도메인 구매는 하지 않습니다.

| 후보 | 무료 조건·이용 제한 |
|---|---|
| [Render Free Web Service](https://render.com/docs/free) + Spring | 0.1 CPU·512MB, 워크스페이스 월 750시간, 15분 무요청 시 절전·재기동 약 1분. [Hobby 포함량](https://render.com/articles/how-much-does-cloud-application-hosting-cost-for-small-businesses)은 월 발신 5GB·빌드 500분. 임시 파일은 재시작/배포/절전 때 소실, 영구 디스크·SSH·one-off job 없음. 외부 DB 등 과도한 발신 트래픽으로 정지 가능. 카드가 있으면 대역폭/빌드 초과 추가 과금 가능, 카드가 없으면 남은 월의 서비스/새 빌드 제한 |
| [Neon Free](https://neon.com/pricing) + PostgreSQL | 카드 없이 $0, 프로젝트당 저장 1GB·월 100 CU-hours·공용 전송 5GB, 5분 비활성 시 절전. CU/전송 초과 시 다음 기간까지 compute 정지, 저장 한도 초과 시 용량 증가 작업 실패. 자동 유료 전환을 선택하지 않음 |
| Render Free Postgres | 1GB·워크스페이스 하나, 생성 30일 뒤 만료·추가 14일 뒤 삭제, 백업 없음. 장기 보존할 검토 DB에는 부적합 |

Render 무료 환경은 운영용 보장이 없고 언제든 재시작될 수 있습니다. Java는 [Docker 배포](https://render.com/docs/docker)가 필요하며 무료 인스턴스의 512MB 메모리에서 JVM·Spring 기동을 실측해야 합니다. [Render DB](https://render.com/docs/postgresql-creating-connecting)는 13~18, [Neon](https://neon.com/docs/reference/compatibility)은 14~18을 지원하므로 기존 로컬 PostgreSQL 18과 같은 메이저를 선택할 수 있습니다. 실제 제공 마이너·리전·연결 한도는 생성 화면에서 재확인합니다. Render Web은 HTTPS 주소, Neon DB는 TLS 접속을 사용합니다.

[Neon 한도·복구 조건](https://neon.com/docs/introduction/plans)에 따르면 무료 복구 이력은 최대 6시간/변경량 1GB이고 수동 snapshot 1개·모니터링 이력 1일이며 예약 백업은 없습니다. 저장은 프로젝트당 1GB·계정 합계 20GB, 전송은 프로젝트당 월 5GB입니다. 복구 이력은 장기 백업을 대신하지 않으며 별도 검토 DB의 백업·복원 검증이 필요합니다. 유료 업그레이드 후에는 사용량 과금 조건이 달라집니다. 개인 검토 적합성과 광고·수익화 이용 조건의 확정은 구분합니다.

### 검토 배포 설정

| 항목 | 검토 환경 |
|---|---|
| Neon 조직·프로젝트 / DB | `nadeulirang-review` / `nadeulirang_review`, 실제 PostgreSQL 18.6·AWS Singapore·Free·0.25 CU 고정 |
| Render 서비스 | `nadeulirang-review-api`, Web Service·Docker·Singapore·Free |
| Git / Root Directory | `codex/vercel-review` / `backend` |
| Dockerfile / Build Context | Root Directory 기준 `./Dockerfile` / `.` |
| Health Check Path | `/actuator/health/readiness` |
| Auto-Deploy | Off, 검증한 커밋을 수동 배포 |
| 비밀 환경변수 | `DB_URL`·`DB_USERNAME`·`DB_PASSWORD`만 Render에 설정. 홈/로컬 설정·OAuth·원천 키를 복사하지 않음 |

Spring 주소는 [검토 API](https://nadeulirang-review-api.onrender.com/actuator/health)이며 Vercel의 실제 화면은 [프론트 검토 주소](https://nadeulirang-review-kimseongchwis-projects.vercel.app/)입니다. 2026-10-26 Render의 Docker 빌드·512MB 무료 인스턴스 기동·Flyway V1~V8·TLS DB health·홈/목록/상세 API와 Vercel 정상 표시를 확인했습니다. 최초 Spring 기동은 141초, 실제 유휴 종료 뒤 재기동은 140초였습니다. 절전 뒤 첫 Vercel 접속의 실패 안내와 기동 후 같은 재시도 버튼의 정상 홈·DB health UP·검색 51건 회복을 확인했으며 문서의 일반적인 약 1분보다 길 수 있습니다.

[Dockerfile](Dockerfile)은 Java 21 JDK에서 Maven Wrapper로 JAR를 만들고 비root Java 21 JRE로 실행합니다. 이미지 빌드에는 DB 값이 필요 없습니다. DB 회귀·패키징은 먼저 루트 `commit:checked`와 CI에서 실행하고 이미지 빌드는 테스트를 반복하지 않습니다. 512MB에서 기동 가능 여부는 실제 Render 결과로 판단합니다. JVM은 heap 256MB·SerialGC·프로세서 1개·제한한 metaspace/code cache/direct memory를 사용하며 전체 RSS는 heap보다 큽니다.

빌드 단계에만 `unzip`을 설치해 Wrapper가 등록된 ZIP과 SHA-256을 그대로 사용하게 합니다. `unzip`이 없으면 Wrapper는 tar.gz를 받으면서 ZIP 해시로 검사하여 실패합니다. 검증을 끄거나 다른 파일의 해시로 바꾸지 않으며 runtime 이미지에는 압축 도구를 추가하지 않습니다.

[review 프로필](src/main/resources/application-review.properties)은 Docker에서만 기본 활성화됩니다. `PORT`를 Spring 포트로 사용하고 Hikari는 최대 3개·최소 유휴 0개·유휴 60초·keepalive 0·연결 대기 5초입니다. 매분 JDBC 세션 정리도 끕니다. 로그인 제외 검토용 선택이며 향후 인증 도입 시 세션 정리/용량 정책을 다시 마련해야 합니다. 기존 로컬 기본 설정과 Flyway V1~V8·`ddl-auto=validate`·`clean-disabled=true`는 유지합니다.

Render의 주기적 readiness는 `readinessState`만 확인하여 DB를 깨우지 않습니다. `/actuator/health`는 DB를 포함하므로 수동 연결/장애 검사 때만 호출합니다. readiness 200은 서버 준비 완료이며 DB 성공의 증거가 아닙니다. 실제 API 성공까지 확인해야 서비스 연결 성공입니다. 외부 uptime 감시·절전 방지 ping은 등록하지 않습니다.

`DB_URL`은 비밀번호 없는 직접 연결 JDBC 주소에 `sslmode=verify-full&sslfactory=org.postgresql.ssl.DefaultJavaSSLFactory&connectTimeout=10&socketTimeout=15`를 사용합니다. [pgJDBC TLS](https://jdbc.postgresql.org/documentation/ssl/)의 Java 신뢰 저장소·호스트 검증을 이용하며 별도 인증서 파일을 복제하지 않습니다. 자격정보는 Render 비밀 환경변수에만 저장하고 Vercel에는 Spring HTTPS 원점의 서버 전용 `BACKEND_URL`만 설정합니다.

### 공개 자료의 제한 이관

기존 로컬 DB는 읽기 전용으로 조회합니다. [내보내기 도구](../scripts/export-review-data.ps1)는 공개 후보 최대 100건과 허용 라이선스의 원천 연결·원문 관측·근거·공개 검토·Type1 활성 사진만 `.local/review/public-import.sql`에 만듭니다. 회원·인증·세션·커서·연결 이력은 제외합니다. `source_call`의 전체 응답 payload는 다른 비공개 항목을 포함할 수 있어 제외하고 query도 빈 객체로 제한합니다. 선택한 항목의 원문은 `source_observation.raw_row` 그대로 보존합니다. 사진 바이너리는 복제하지 않습니다.

~~~powershell
./scripts/export-review-data.ps1
~~~

기존 검토본이 있으면 덮어쓰지 않습니다. 원문과 이용허락을 검토한 뒤 새 검토 DB에서 Spring의 Flyway 적용을 먼저 확인하고 이관 SQL을 실행합니다. 대상에 항목/원천/호출/회원/세션이 있으면 중단하며 전체 삽입은 한 트랜잭션입니다. 로컬 DB 전체 dump를 외부로 복원하지 않습니다. 로컬 검토본·로그는 Git 제외이며 일반 배포 이미지에 넣지 않습니다.

SQL의 원문 JSON은 UTF-8 Base64로 전달하고 DB에서 복원하여 편집기의 `E'...'` 문자열 분할 차이를 피합니다. 대용량 편집기 전송은 작은 구간으로 나누되 실행 전 전체 검토본과 정확히 일치하는지 확인합니다. 편집기 오류는 해당 트랜잭션을 ROLLBACK한 뒤 대상이 비었는지 확인하고 재시도합니다.

이번 제한 이관은 공개 후보 72건·원천 연결 74건·원문 관측 359건·근거 6,381건·허락 사진 35건입니다. 회원/세션 0건·원문 지문 일치를 확인했고 이관 직후 DB는 11,730,944바이트(약 11.2MiB)였습니다. 검색 51건과 과거/다른 기간의 공개 후보 수는 구분합니다. 무료 수동 snapshot 1개를 만들고 별도 분기로 복원해 건수·원문 지문·회원 0건을 재확인했으며 원래 연결을 전환하지 않았습니다. 복원 검증 분기는 원본/스냅샷과 함께 보존하고 프로젝트 전체 CU/저장 포함량을 공유하므로 이후 사용량 확인에 포함합니다. snapshot은 그 시점의 복구점이며 이후 수집의 자동 백업을 대신하지 않습니다.

연결 후에는 홈·검색·간단 보기·상세·사진·빈 결과·404·페이지/뒤로가기 복귀, HTML 실패 200/noindex·중계 503·재시도, DB 절전과 Render 15분 절전 후 회복을 실제 주소에서 구분해 검증합니다. Render 재기동 약 1분은 프론트 8초 제한보다 길 수 있으므로 첫 실패를 0건으로 해석하지 않고 기동 후 재시도로 확인합니다. 프론트 timeout 연장이나 절전 방지 호출을 먼저 추가하지 않습니다.

### 수동 수집·일일 예약의 다음 단계

연결 재확인 후 추가 수집은 사용자가 요청한 운영계정·이용 조건 확인을 선행하며 보류합니다. 실제 크론·관리자 화면도 등록/구현하지 않습니다. 개발계정의 호출 자격과 저장 자료의 이용허락은 별개이고, 기존 로컬 자료 일부를 Neon으로 이관한 사실을 새로운 운영계정 수집으로 표시하지 않습니다. 개발 키로 수집했다는 이유만으로 기존 원문을 삭제하거나 전량 재수집하지 않습니다. 계정별 실제 승인·기간·한도·잔량은 [원천 기준](../docs/DATA_SOURCES.md#승인-계정과-호출-제한)을 확인합니다.

재개할 때는 저장 원문부터 대조해 부족한 대상/오퍼레이션을 결정합니다. 로컬 DB를 갱신할 때는 기존 [수집 실행](#데이터-수집-p11p38)의 `batch -MaxItems 20` 또는 검토 대상의 `supplement`를 수동 실행하고 공개 심사를 거칩니다. `collect-data.ps1`은 로컬 DB 설정을 적용하므로 외부 DB 갱신 명령으로 그대로 사용하지 않습니다.

외부 DB 수동 실행은 별도 실행 프로세스의 DB 비밀 환경변수와 원천 키 전용 파일을 준비한 뒤 같은 JAR를 `--collection.run=true --collection.mode=batch --collection.max-items=20 --collection.campaign=<검토한-캠페인> --collection.env-file=<원천-키-전용-경로> --spring.main.web-application-type=none`으로 실행하는 방식입니다. 기존 DB/홈 설정을 업로드하지 않고 승인된 새 환경값만 주입합니다. `batch`는 기본 월별 커서부터 이어가며, 매일 기존 항목을 다시 검증하는 전체 갱신 작업을 대신하지 않습니다. 기존 공개 대상의 `seed`·부족한 필드의 `supplement` 범위와 원천 일일 한도·예산·실패 보존을 먼저 검토해야 합니다.

일일 예약은 이 수동 실행이 반복 가능해진 다음 별도 작업으로 진행합니다. 서울 기준 실행 시각·최대 건수·원천 예산·중복 실행 잠금·실패 시 재개/알림·갱신 후 공개 심사·백업 복원을 정하고 스케줄러의 무료 한도와 비밀 관리부터 확인합니다. Render Free는 cron/one-off 실행을 제공하지 않으며 Render Cron은 [최소 월 $1](https://render.com/articles/how-much-does-cloud-application-hosting-cost-for-small-businesses)이므로 이번 무료 범위에 등록하지 않습니다. 로컬 작업 스케줄러는 PC 기동이 필요하고, GitHub Actions는 저장소 공개 여부·포함 실행량·비밀 사용 범위를 확인한 뒤 별도 선택할 수 있습니다.

2026-10-26 공식 조건을 대조한 예약 검토안이며 실행 설정은 아직 없습니다.

| 실행 위치 | 무료 조건·제약 | 선택 전 확인 |
|---|---|---|
| [Windows 작업 스케줄러](https://learn.microsoft.com/en-us/windows/win32/taskschd/task-scheduler-start-page) | 기존 PC에서 실행, 별도 호스팅 요금 없음. PC·네트워크 기동 필요 | 누락 실행 처리·동시 실행 금지·종료 코드/로그 알림·별도 검토 DB 실행 환경 |
| [GitHub Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions) | 공개 저장소의 표준 호스팅 runner 무료. 비공개 GitHub Free는 월 2,000분·artifact 500MB, 캐시 10GB 포함. 큰 runner는 별도 과금 | 저장소 공개 여부·계정 잔량·추가 지출 차단·검토 전용 Secrets/권한 확인. DB 백업과 비밀 파일을 공개 artifact에 올리지 않음 |

[Actions 예약](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)은 기본 브랜치의 workflow만 실행하고 혼잡 시 지연/누락될 수 있으며 공개 저장소는 60일 무활동 시 예약이 비활성화됩니다. 이번 요청은 main 반영을 제외하므로 작업 브랜치만으로 실제 예약을 완료할 수 없습니다. 기본 UTC 또는 `Asia/Seoul` 시간대를 명시할 수 있고 정각을 피한 서울 06:17을 검토 시각으로 제안합니다. 등록·시각 확정은 별도입니다.

예약 범위도 다음을 충족한 뒤 확정합니다.

1. 신규 후보는 별도 campaign의 `batch` 커서로 최대 20개만 검토 대기 저장합니다. 기존 공개 갱신은 변경 목록·기간 행사 7일/시설 30일 및 적용 기간의 재검토 대상을 별도 선정합니다. `batch` 커서 재개를 일일 갱신 완료로 표시하지 않습니다. 첫 수동 실행은 신규/갱신을 합해 최대 20개로 제한합니다.
2. TourAPI 24시간 800회·표준 원천별 8,000회 자체 상한과 직렬 요청·최소 1초 간격을 유지하며 계정 잔량이 더 적으면 그 안으로 축소합니다. 첫 재개는 대상/오퍼레이션별 예상 호출을 계산해 작은 실행 예산을 정하고 이미지 API는 기본 0회로 둡니다.
3. 실행 위치의 동시 실행 금지와 기존 DB advisory lock·호출 예약을 함께 사용합니다. 부분 완료는 저장 커서/호출 결과로 재개하며 인증·기간·한도 오류는 중단하고 실패/빈 응답으로 기존 값을 지우지 않습니다. 신규 공개와 명시 취소/삭제는 심사 대상으로 남깁니다.
4. 실패·예산 중단·미실행을 정상 0건과 구분해 로컬 종료 코드 또는 Actions 실패 알림으로 전달합니다. 수신 위치와 알림 설정은 사용자가 선택하며 아직 외부 알림을 발송/등록하지 않습니다.
5. 변경 전 복구점과 건수/원문 지문을 확인하고, 검토 전용 암호화 백업을 별도 보관하는 방식을 정합니다. 회원/세션을 포함하지 않고 별도 분기/격리 DB에서 복원을 검증한 뒤에만 연결 전환을 검토합니다. 현재 수동 snapshot 1개는 그대로 보존하며 재수집 때 자동 갱신되는 백업으로 취급하지 않습니다.

장기 무료 용량은 단일 DB의 현재 크기만으로 보장하지 않습니다. 이관 직후와 수동 수집 전후 `SELECT pg_database_size(current_database());` 및 `pg_total_relation_size`로 원문/근거/인덱스별 증가량을 기록하고, Neon Usage의 저장·history·CU-hours·전송과 Render Billing의 시간·빌드·전송을 함께 확인합니다. `최근 증가량 / 경과일`로 일일 증가를 추정해 1GB까지 남은 기간을 계산하되 전체 수집량·사진 메타데이터·인덱스·원문 갱신 누적을 포함합니다. 미사용 브랜치도 저장/연산량에 영향을 줍니다. 한도 접근 시 수집을 멈추고 보존/백업 범위를 검토하며 자동 유료 전환이나 원문 삭제로 대응하지 않습니다.

~~~sql
SELECT pg_database_size(current_database()) AS database_bytes;
SELECT relname, pg_total_relation_size(relid) AS total_bytes
FROM pg_stat_user_tables
WHERE schemaname = 'nadeulirang'
ORDER BY total_bytes DESC;
~~~

계정 생성·약관/권한 동의가 필요한 화면은 사용자가 직접 처리합니다. 도메인·수익화·로그인/회원·북마크·AI·광고·웹뷰·방문 날짜 필터는 이번 연결 시험의 대상이 아닙니다. 프론트 빌드·서버 변수·검토 주소는 [Vercel 검토 배포](../frontend/README.md#vercel-개인-검토-배포-p15)를 따릅니다.

## 최초 환경 준비

저장소 루트의 PowerShell에서 수행합니다. 기존 환경에서는 [일상 실행](../README.md#빠른-실행)만 사용합니다.

실행 파일·DB·접속 정보는 Git에서 제외한 .local/에 두며 시스템 PATH·Windows 서비스는 등록하지 않습니다. 이 폴더 전체를 환경 정리 목적으로 삭제하지 않습니다.

### JDK 21

[Temurin 공식 배포](https://adoptium.net/temurin/releases/?version=21&os=windows&arch=x64)의 Windows x64 JDK ZIP을 받아 공식 SHA256과 Get-FileHash 결과를 대조합니다. .local/java/jdk-21.<버전>/bin/java.exe 구조로 JDK 하나를 둡니다. use-local-env.ps1은 현재 세션의 JAVA_HOME·PATH·DB 변수만 적용합니다. 스크립트가 차단될 때만 현재 세션에서 Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass를 사용합니다.

### PostgreSQL

[PostgreSQL Windows 안내](https://www.postgresql.org/download/windows/)의 [EDB 바이너리](https://www.enterprisedb.com/download-postgresql-binaries)에서 PostgreSQL 18 ZIP을 받아 .local/postgresql/pgsql/{bin,lib,share}에 둡니다. 아래 초기화는 데이터 폴더가 없는 새 환경에서 한 번만 수행하며 기존 .local/postgres-data는 재초기화·삭제하지 않습니다. 5432가 사용 중이면 기존 DB를 종료하지 않고 접속 포트를 조정합니다.

~~~powershell
. ./scripts/use-local-env.ps1
initdb -D .local/postgres-data -U postgres --pwprompt --encoding=UTF8 --locale=C --auth=scram-sha-256 --set=listen_addresses=127.0.0.1 --set=port=5432 --set=timezone=Asia/Seoul --set=log_timezone=Asia/Seoul
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/local-db.ps1 start
psql -X -h 127.0.0.1 -p 5432 -U postgres -d postgres -W
~~~

관리자 psql에서 앱 계정과 DB를 만듭니다. 비밀번호는 프롬프트로 입력합니다.

~~~sql
CREATE ROLE nadeulirang LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
\password nadeulirang
CREATE DATABASE nadeulirang OWNER nadeulirang ENCODING 'UTF8';
\q
~~~

기존 .env를 덮어쓰지 않고 [.env.example](../.env.example)의 DB_URL·DB_USERNAME·DB_PASSWORD를 추가합니다. JDBC 주소는 jdbc:postgresql://127.0.0.1:5432/nadeulirang입니다. 초기 환경의 관리자/앱 접속 파일은 .local/postgres-admin-password.txt·postgres-admin.pgpass·postgres-app.pgpass에 있으며 새 환경의 프롬프트 초기화는 이 파일을 생성하지 않습니다. 일반 접속 확인은 psql -X -h 127.0.0.1 -p 5432 -U nadeulirang -d nadeulirang -W로 수행합니다. 한글 SQL은 UTF-8 파일과 psql -f를 사용합니다.

### DB 시작·종료

~~~powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/local-db.ps1 status
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/local-db.ps1 start
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/local-db.ps1 stop
~~~

status의 종료 코드는 실행 중 0·중지 3입니다. 재부팅 뒤 자동 시작하지 않으며 stop은 진행 접속을 종료하고 정상 저장합니다. 데이터는 .local/postgres-data/, 로그는 .local/postgres-server.log입니다.


### 작업 폴더 사이의 로컬 설정 유지 (P22)

사용자 홈 .nadeulirang/.env의 원천 키 3개와 DB 설정 3개를 읽고 폴더별 .env의 비어 있지 않은 값만 우선합니다. 파일을 코드로 실행하지 않으며 실제 값은 출력·커밋하지 않습니다. 루트 .env에 6개 항목을 준비한 뒤 필요한 경우에만 보관합니다.

~~~powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/save-local-settings.ps1
~~~

이 명령은 공통 파일을 갱신하고 Windows 접근 권한을 현재 사용자·SYSTEM으로 제한합니다. 작업 폴더 정리는 공통 파일을 삭제하지 않습니다. 다른 PC·배포 서버로 자동 복사하지 않으며 운영 비밀 설정은 P15에서 별도로 준비합니다.


## 수집 실행

저장소 루트에서 실행합니다. 일반 서버 시작은 원천을 호출하지 않습니다.

### 데이터 수집 (P11·P38)

수집은 수동 실행이며 원천·예산·식별자·원문/실패 보존·갱신 기준은 [DATA_SOURCES](../docs/DATA_SOURCES.md#p11-수집-기준)에서 관리합니다. 일반 서버 시작은 수집하지 않습니다. 원천별 Decoding 키를 .env 또는 공통 설정에 넣고 DB를 시작한 뒤 실행합니다.

~~~powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/collect-data.ps1 -Mode batch -MaxItems 100
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/collect-data.ps1 -Mode seed
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/collect-data.ps1 -Mode seed -SeedFile .local/reviewed-collection.json
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/collect-data.ps1 -Mode supplement -SeedFile .local/supplement-targets.json -Operations detailIntro2,detailInfo2
~~~

batch는 다섯 전국 목록에 후보 5~100개를 나눠 처리합니다. 기본 campaign은 서울 YYYY-MM이고 동일 명령은 저장된 페이지/행부터 이어갑니다. -Campaign local-check는 새 순회입니다. 실패 후보는 진행하지 않고 새 후보는 검토 대기로 저장합니다. seed 양식은 [collection-seed.json](src/main/resources/collection-seed.json)의 tour·standard 배열을 따릅니다. supplement는 저장 원문 대조 뒤 부족한 기존 대상/오퍼레이션만 지정합니다. 사진은 허용 메타데이터만 저장하며 웹페이지·사진 본문 복제와 운영 크론은 제공하지 않습니다.

### 원천 API 표본 검증

아래 도구는 원천 키를 설정 파일에서 읽고 공식 주소·허용 오퍼레이션에 한정해 1회·최대 20건을 조회합니다. 인증키·요청 URL·민감한 오류 원문은 출력하지 않습니다. 목록 조회 성공은 당일 운영 확인이 아닙니다.

~~~powershell
node scripts/verify-tourapi.mjs
node scripts/verify-tourapi.mjs detailIntro2 '{"contentId":"130841","contentTypeId":14}'
node scripts/verify-standard-data.mjs museum '{"fcltyNm":"클레이아크 김해미술관","numOfRows":5}'
node scripts/verify-standard-data.mjs festival '{"numOfRows":1}' xml
~~~


### 저장 사진 재처리·제한 보완

개별 검토 목록 형식·보존·예산 기준은 [DATA_SOURCES](../docs/DATA_SOURCES.md#사진-조사와-제한-보완--p76)를 따릅니다. 저장 원문 재처리는 추가 호출 없이 실행합니다.

~~~powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/collect-data.ps1 -Mode photos-replay -SeedFile .local/photo-replay.json
# 실제 추가 호출은 현재 계정 확인 후에만 실행. photoCampaign·검토 photoUrls가 있는 기존 대상 파일 필요
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/collect-data.ps1 -Mode supplement -SeedFile .local/photo-targets.json -Operations detailImage2 -AccountLimit <현재한도> -QuotaRemaining <현재잔량> -QuotaCheckedAt <UTC확인시각> -PhotoCallBudget 2
~~~
