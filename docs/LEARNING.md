# 나들이랑 코드 학습

현재 코드의 핵심 타입·파일 역할·호출 흐름·선택 이유를 설명한다. 실행은 [README](../README.md), 제품 기준은 [PRD](PRD.md), 원천 규칙은 [DATA_SOURCES](DATA_SOURCES.md)를 따른다. 관련 구현은 P10~P13·P38·P71·P73·P74다.

## 실행 환경과 설정

[use-local-env.ps1](../scripts/use-local-env.ps1)은 현재 PowerShell의 JAVA_HOME·PATH와 DB 변수만 준비한다. [local-db.ps1](../scripts/local-db.ps1)의 DB 시작은 별도 동작이다. 다른 터미널은 이 프로세스의 환경을 자동 공유하지 않는다.

[local-settings.mjs](../scripts/local-settings.mjs)·[local-settings.ps1](../scripts/local-settings.ps1)·CollectionRunner.readKeys는 공통 설정을 먼저 읽고 폴더별 비어 있지 않은 값만 덮어쓴다. 파일을 명령으로 평가하지 않아 비밀번호의 $()도 문자로 읽는다. 공통 설정은 같은 PC에서 유지하는 로컬 파일이며 배포 비밀 설정과 구분한다.

## Java와 Spring 시작 코드

[NadeulirangApplication](../backend/src/main/java/kr/nadeulirang/backend/NadeulirangApplication.java)의 public class는 타입 선언, public static void main(String[] args)는 인스턴스 없이 호출하는 시작 메서드다. SpringApplication.run(NadeulirangApplication.class, args)는 라이브러리 메서드 호출이며 Class 객체와 실행 인수를 전달한다. import 자체는 객체를 만들거나 서버를 실행하지 않는다.

CollectionStore의 private final JdbcTemplate jdbc는 타입·이름을 가진 필드다. 생성자는 Spring이 전달한 DB 도구·트랜잭션 관리자·Repository를 받아 필드에 연결한다. var는 초기값으로 지역 변수 타입을 추론하고, record는 생성자·접근 메서드·값 비교를 Java 컴파일러가 제공하는 데이터 타입이다. Optional<T>는 값이 없을 수 있음을 표현하고 List<T>는 여러 값을 담는 제네릭 타입이다.

| 어노테이션 출처·대상 | 누가 언제 해석하는가 |
|---|---|
| org.springframework.boot.autoconfigure.SpringBootApplication · 시작 클래스 | Boot가 run 시 설정·하위 패키지 빈 탐색·자동 구성을 준비 |
| org.springframework.stereotype.Component · 조율 클래스/실행기 | Spring이 시작 시 빈 후보를 찾아 생성자 의존성을 연결 |
| org.springframework.web.bind.annotation.RestController·GetMapping · 클래스/메서드 | Spring MVC가 시작 시 경로를 등록하고 HTTP 요청 때 메서드를 호출·응답을 직렬화 |
| org.springframework.boot.autoconfigure.condition.ConditionalOnProperty · CollectionRunner | Boot가 시작 때 collection.run=true를 평가해 수집 실행기 등록 여부 결정 |
| org.springframework.transaction.annotation.Transactional · OutingStore/커서 메서드 | Spring 프록시가 외부 호출을 감싸 트랜잭션을 시작·완료/롤백 |

어노테이션은 정보이며 그 자체가 일을 실행하는 문장이 아니다. CollectionRunner는 등록된 ApplicationRunner로 초기화 후 run을 호출받는다. 일반 웹 서버 실행은 수집 옵션을 주지 않으므로 원천을 호출하지 않는다.

### Flyway와 DB 시작

Boot는 DataSource·Hikari 연결 풀을 준비하고 Flyway를 적용한 뒤 Hibernate 모델을 검증한다. 연결의 기본 스키마는 nadeulirang, 시간대는 Asia/Seoul이다. schema.sql·ORM create/update를 함께 사용하지 않고 이미 적용한 Flyway 파일의 체크섬을 유지한다. ddl-auto=validate는 테이블을 변경하지 않으며 모델과 실제 DB가 맞지 않으면 시작을 실패시킨다. [Boot DB 초기화 안내](https://docs.spring.io/spring-boot/how-to/data-initialization.html)

### health 주소와 404를 구별하기

Next.js와 Spring은 서로 다른 서버다. 포트에 서버가 없으면 접속 실패, 서버가 있지만 경로가 없으면 404, Spring health의 DB 장애는 503이다. /actuator/health는 연결 상태만 검사하며 수집 품질·모든 제품 동작의 검증을 대신하지 않는다.

## 데이터 모델과 수집 코드

### 원문과 제품 항목의 ID

outing은 서비스 내부 ID·검토/표출·분류·요금/일정 요약, source_record는 원천 식별자와 내부 ID 연결, source_observation은 호출별 원문, field_evidence는 필드 값·출처·기준일·확인 시각이다. source_link_history·outing_review는 검토한 연결/제품 결정의 근거를 보존한다. 원문만 저장하면 조회 때마다 재해석해야 하고 요약만 저장하면 근거를 잃으므로 두 가지를 유지한다.

TourAPI는 contentid를 사용한다. 표준 원천의 연결 후보는 이름·기관·정규화 주소이며 축제는 기간·장소까지 포함한다. 페이지/행 순번·이름만으로 합치지 않는다. ingest의 ON CONFLICT는 실제 유일 제약을 기준으로 같은 호출/행의 재처리를 멱등하게 처리한다. 새 호출의 원문은 이력으로 남는다.

### JPA 저장과 트랜잭션

JPA는 객체를 DB에 저장·조회하는 표준 API, Hibernate는 그 표준을 실행해 SQL·객체 변경 추적을 처리하는 구현체, Spring Data JPA는 Repository 인터페이스로 반복 조회/저장 구현을 제공하는 Spring 도구다. [Spring Data JPA](https://spring.io/projects/spring-data-jpa/)

| 실제 모델 → 테이블 | 필드·제약의 의미 |
|---|---|
| [CollectionSourceEntity](../backend/src/main/java/kr/nadeulirang/backend/collection/CollectionSourceEntity.java) → collection_source | Source enum 이름이 PK. blockedReason·lastStartedAt은 처음에는 null이며 원천 중단·간격을 관리 |
| [SourceCallEntity](../backend/src/main/java/kr/nadeulirang/backend/collection/SourceCallEntity.java) → source_call | 앱에서 만든 UUID PK·원천·오퍼레이션·query jsonb·시도/완료 시각·결과/본문. 실패·실행 중 시도도 예산에 포함 |
| [CollectionCheckpointEntity](../backend/src/main/java/kr/nadeulirang/backend/collection/CollectionCheckpointEntity.java) → collection_checkpoint | streamKey PK·원천/목록 조건·페이지/행·완료 상태. page_call은 새 페이지/완료 시 null인 FK |

source_call.source·checkpoint.source/page_call의 관계는 원천 이름·호출 UUID로만 매핑한다. DB의 기존 FK가 무결성을 보장하며 객체 관계·cascade를 추가하지 않아 원문 연쇄 삭제·N+1 조회·순환 응답을 피한다. 필요한 엔티티 3개만 만들고 공개 나들이 응답은 기존 OutingResponse record를 유지한다.

| 모델/Repository의 어노테이션 | 출처·대상·해석과 처리 시점 |
|---|---|
| Entity·Table(name=...) | jakarta.persistence · 클래스. Hibernate가 시작 시 매핑을 등록·검증 |
| Id·Column(name=..., nullable=..., columnDefinition=...) | jakarta.persistence · 필드. Hibernate가 로딩/쓰기에서 PK·실제 컬럼 타입을 사용. 유일/FK/check 제약 생성은 Flyway 담당 |
| Enumerated(EnumType.STRING) | jakarta.persistence · Source 필드. Hibernate가 조회/저장 시 enum 이름을 text로 변환, enum 순번 변화에 영향받지 않음 |
| JdbcTypeCode(SqlTypes.JSON) | org.hibernate.annotations/hibernate.type · JSON 문자열 필드. Hibernate가 바인딩/읽기 시 PostgreSQL jsonb를 사용, 문자열을 JSON 문자열 값으로 이중 인코딩하지 않음 |
| Lock(PESSIMISTIC_WRITE)·Query | org.springframework.data.jpa.repository · Repository 메서드. Spring Data가 시작 시 쿼리를 준비하고 호출 때 행 잠금 쿼리를 실행 |
| Modifying·Query(nativeQuery=true) | 같은 Spring Data 패키지 · 커서 initialize. 호출 때 최초 생성의 ON CONFLICT DO NOTHING 실행 |

protected 기본 생성자는 Hibernate가 조회 결과로 객체를 만들 때 사용한다. 필드에 매핑을 붙여 getter/setter를 모두 공개할 필요가 없다. private 필드 변경은 관리 중인 객체의 메서드로 수행하고 Hibernate가 트랜잭션 완료 시 변경 내용을 반영한다.

호출 흐름은 SourceClient → CollectionStore.reserve → CollectionSourceRepository.lock → SourceCallRepository.countBySourceAndStartedAtAfter/save → Hibernate SQL → PostgreSQL이다. Repository는 필요한 메서드만 노출하는 Spring Data Repository 인터페이스다. 구현 객체는 Spring Data가 시작 시 만들어 생성자로 전달한다. 호출 예산 확인과 STARTED 저장은 원천 행 잠금을 가진 트랜잭션으로 커밋하고 **그 뒤** 네트워크를 호출한다. 네트워크/행 저장 실패가 이미 소비한 호출을 되돌리지 않는다.

CollectionStore의 TransactionTemplate은 JPA와 남은 JdbcTemplate SQL을 같은 JpaTransactionManager·DataSource 연결로 묶는다. finish는 호출 결과와 원천 중단 상태를 같이 확정하고 ingest는 제품·원문·필드·사진·요약 갱신을 함께 롤백한다. JPA는 쓰기를 완료 시점까지 늦출 수 있으므로 같은 트랜잭션에서 JDBC가 새 값을 읽어야 한다면 flush가 필요하다. 현재 호출 예약·결과는 외부 ingest 호출 전에 커밋되며 [공동 롤백 테스트](../backend/src/test/java/kr/nadeulirang/backend/collection/CollectionStoreTests.java)가 flush 후 JDBC 읽기와 SQL 실패의 공동 롤백을 확인한다.

원천 상태·호출 기록·커서 갱신/성공 페이지 조회의 JDBC 코드는 JPA로 대체했다. 커서 최초 생성은 경합 시 기존 위치를 덮지 않도록 native ON CONFLICT를 유지한다. query 비교는 Repository의 파생 조회를 통해 jsonb 동등성으로 처리해 키 순서·1/1.0 차이를 허용한다. 원문 upsert·최신 근거 뷰·같은 관측의 날짜 쌍·요금 충돌·공개 조회는 PostgreSQL SQL이 보장 조건을 더 직접적으로 보여줘 유지한다. JDBC는 JPA starter의 하위 의존성으로 여전히 필요하며 직접 starter-jdbc 중복 선언만 제거했다.

CollectionStore·CollectionCheckpointStore·OutingStore는 처리/조회 조율용 Component다. 직접 JdbcTemplate이 SQL 접근 예외를 변환한다. 이 클래스에 Repository 예외 변환까지 적용하면 정책의 IllegalArgumentException/IllegalStateException이 JPA 접근 오류로 바뀌어 API 400 계약이나 예산 중단 처리를 깨뜨리므로 사용하지 않는다. JPA Repository 자체의 DB 오류 변환은 Spring Data가 처리한다. 배치 잠금은 finally에서 해제해 정책 실패 후에도 다음 실행을 허용한다.

### 응답·정책·커서

SourceResponse record는 outcome·code·JsonNode payload·List<JsonNode> rows를 담는다. Jackson의 JsonNode/JsonMapper는 JSON 라이브러리 타입이다. parse는 HTTP·원천 결과 코드·본문을 검사하고 키를 제거한다. CollectionPolicy는 0원/미확인·조건 문장·분류·서울 날짜 경계를 처리한다. SourceClient는 공식 주소·허용 요청·간격·예산을 제한하며 원천 세션 잠금은 네트워크 요청 전체를 직렬화한다.

CollectionRunner는 수동 seed·batch·supplement를 조율한다. 커서는 성공 목록 응답을 재사용하고 부분 페이지의 다음 행에서 이어간다. 실패 후보에서는 진행하지 않는다. 이는 변경 목록 전체 추적이나 운영 크론이 아니며 그 미완료 조건은 DATA_SOURCES에서 관리한다.

## 목록·상세 HTTP 조회와 공개 경계

OutingController는 URL 값을 OutingQuery로 검사하고 Clock에서 받은 한 Instant를 OutingStore에 전달한다. API 응답은 엔티티 대신 별도 record다. OutingErrorHandler는 잘못된 조건 400·없는/비공개 404·DB/트랜잭션 실패 503을 제공하며 SQL/설정 원문을 반환하지 않는다. 정확한 필드는 [API 계약](../backend/README.md#목록상세-조회-api)을 따른다.

OutingStore는 REPEATABLE_READ·readOnly 트랜잭션으로 한 응답의 건수·항목·근거를 맞춘다. 홈 세 구분은 동일 시각·트랜잭션 안에서 각각 DB가 최대 3개를 선정한다. 상한 조건은 페이지 분할 전에 적용한다. 외부 프록시 호출이 트랜잭션을 열며 내부 list 호출이 새 프록시 호출이 되는 것은 아니다.

공개 SQL은 승인·표출·이용허락·실제 원문을 모든 조회에 적용한다. 상세는 공개 가능한 종료/취소도 유지하고 목록은 제외한다. 바인딩은 값의 SQL 삽입을 막으며 strpos는 %/_도 문자 그대로 검색한다. V5 effective_field_evidence는 같은 원천/대상/오퍼레이션/필드의 유효 기준일·마지막 유효 응답을 선택한다. 원문·실패·빈 값은 보존하며 빈 상세가 기존 요금/날짜를 지우지 않는다. 같은 기준일·교차 원천의 서로 다른 요금/날짜 쌍을 임의로 합치지 않는다.

## 프론트 파일과 실행 흐름

### 서버 페이지와 브라우저 상태

[page.tsx](../frontend/src/app/page.tsx)는 URL 조건·서버 조회, 옆 [HomeScreen](../frontend/src/app/home-screen.tsx)은 UI를 맡는다. 검색·상세·정책도 페이지 전용 화면을 옆에 둔다. 공통 UI는 components, 실제 공유 카드·나들이 타입·API/텍스트 처리는 features/outings에 둔다. 이는 폴더 역할이며 Next.js의 필수 폴더 이름은 아니다.

서버 page → api-server → 공통 requestJson/isHome/isPage/isDetail 검사 → 화면 props 흐름으로 실제 본문을 렌더링한다. 타입은 컴파일 때만 검사하므로 외부 JSON은 unknown으로 읽고 런타임 검사가 필요하다. use client 화면은 상태/클릭·브라우저 API를 사용한다. React props는 부모 입력, state는 컴포넌트가 갱신하는 값이다. 원천 문장은 JSX 텍스트로 표시하고 HTML로 삽입하지 않는다.

간단 보기는 열릴 때 /api/outings/:id의 Next route를 요청한다. 서버 전용 백엔드 주소와 같은 출처·검증/오류 계약을 유지하는 중계다. 공통 [api-request.ts](../frontend/src/features/outings/api-request.ts)는 HTTP/연결/본문 실패를 구분하고 시간 제한·캐시 제외·리다이렉트 차단을 적용한다. 닫기/항목 변경은 AbortController로 취소해 늦은 응답이 화면을 덮지 않게 한다. 가이드 표본은 실제 조회 실패의 대체값으로 사용하지 않는다.

### URL·이력·시트 복귀

[NavigationProvider](../frontend/src/providers/navigation-provider.tsx)는 검색/필터 URL·sessionStorage·pending·해시 시트를 연결한다. 조건 변경은 서버 재조회와 첫 페이지/상단 포커스, 뒤로/앞으로는 이전 위치 복원, 같은 페이지 모달 닫기는 열기 버튼 포커스·스크롤 복원이다. 해시 변경을 새 페이지 이동으로 처리하지 않는다. 기존 탭 호환성을 위해 저장 키·history 속성 이름은 보존한다.

searchFormQuery는 URLSearchParams를 복사해 제출 조건을 만들고 scope를 period/days로 바꾸며 이전 page를 제거한다. Pagination도 page만 바꿔 나머지 조건을 유지한다. 가이드에서는 URL 이동 대신 onPageChange 상태만 사용한다.

Dialog는 service-scroll의 실제 본문 스크롤 영역을 사용한다. 포인터 핸들 드래그와 내부 본문 스크롤을 분리하고 ResizeObserver로 내용/사진 변화 뒤 기본 높이를 다시 계산한다. 확장 높이·고정 버튼·짧은 화면 경계는 sheet-drag의 계산과 테스트로 확인한다.

### 근거·텍스트·공유 UI

detail-content·detail-information·fee-blocks는 표시용 배열만 만든다. 관측 ID로 반복 안내의 제목/본문을 묶고 의미가 같은 범위의 동일 문장만 정리한다. 입장 무료와 주차 무료는 분리한다. 주소/시간/전화/연령/기간/괄호 예외를 보존하며 모호한 요금 블록은 임의로 분류하지 않는다.

ExpandableDetailText는 소개·프로그램의 긴 본문만 펼친다. program-text는 확실한 소제목 접두부만 반환해 strong으로 감싸고 본문을 보존한다. 상세 최신 확인 안내의 refreshNeeded는 원천/필드/링크의 stale와 최근 실패를 합친 조건이며 로딩이나 실제 갱신 실행을 뜻하지 않는다. 공유 InlineNotice는 정적 note이고 급한 alert로 읽히지 않는다.

file_asset은 사진 URL·출처·유형·관측/시각만 보존한다. PhotoPolicy와 API 검사는 허용 호스트/유형을 제한한다. OutingArtwork는 누락·실패 때 아이콘을 사용한다. 브랜드 팔레트는 SiteShell CSS 변수와 icon.ts가 공유한다. 가이드 카드·달력·개발 표시는 features/ui-design에 있으며 실제 서비스와 공유 UI를 사용한다.

## 테스트와 개발 도구

백엔드 테스트는 실행마다 UUID 스키마에서 실제 PostgreSQL의 제약·마이그레이션·잠금·롤백·API를 검증한다. 테스트 초기화는 앱 스키마에 접근하지 않는다. 순수 정책 테스트는 날짜·요금·분류·원천 응답을 빠르게 확인한다.

프론트 회귀는 URL 조건·런타임 계약·요금/시간·원문/소제목 보존·시트 경계를 확인한다. 없어진 가이드 검색 구현 테스트는 제거하되 서울 자정·윤년은 date-model.test.mjs에 남긴다. 로컬 도구 테스트는 인증값 비노출·설정 우선순위·커밋 차단을 검증한다. 훅/CI 명령은 README를 따른다.

선택 연습: SourceCallRepository.save 뒤 JDBC로 읽는 시점을 커밋 전/후로 비교하거나 빈 요금과 문자열 0의 차이를 CollectionPolicyTests에서 확인한다. 제품 코드를 학습용으로 변경할 필요는 없다.
