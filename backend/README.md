# 백엔드

Spring Boot·Java 21·Spring Data JPA·Hibernate·PostgreSQL을 사용합니다. 실행·검증은 [루트 README](../README.md#백엔드-실행검증)를 따릅니다.

## 구조

- collection/: 원천 HTTP 클라이언트·수동 실행기, 호출/원천/커서 JPA 모델과 Repository, 근거·충돌을 조율하는 CollectionStore.

CollectionRunner는 실행 방식을 조율하고 일반 상세/보완의 응답 저장을 공유합니다. CollectionStore의 자료 연결 변경은 양쪽 날짜/요금 요약도 같은 트랜잭션에서 갱신합니다. 원문·연결 이력은 보존하며 호출·커서·행 저장의 트랜잭션을 합치지 않습니다. 개념과 실제 흐름은 [LEARNING](../docs/LEARNING.md#데이터-모델과-수집-코드)을 참고합니다.
- outing/: 요청 조건·컨트롤러·SQL 조회·응답 record·오류 처리. 엔티티는 외부에 노출하지 않습니다.
- auth/: 회원·소셜 OAuth2/OIDC·최근 재인증·DB 세션/권한 경계와 동일 출처 중계용 API.
- resources/db/migration/: Flyway V1~V8. 기존 적용 파일은 수정하지 않습니다. Hibernate ddl-auto=validate·open-in-view=false로 자동 DDL·요청 밖 추가 조회를 막습니다.
- src/test/: UUID 격리 PostgreSQL의 API·수집·JPA/SQL 공동 트랜잭션 회귀와 순수 정책 테스트.

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
