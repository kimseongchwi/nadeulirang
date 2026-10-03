# 나들이랑 개발 학습 기록

이 문서는 나들이랑을 만들면서 Java·Spring·React의 구조와 선택 이유를 공부하기 위한 설명서다. 해결한 문제, 선택의 이점과 비용, 실제 코드, 확인 방법을 연결한다. Java 코드의 문법을 읽고 Spring이 더하는 동작을 구별하며 작은 변경의 영향을 예상할 수 있는 것을 학습 목표로 삼는다.

작성 기준은 2026-10-03의 코드와 Git 이력이다. **기록된 근거**는 당시 문서·커밋에서 확인한 이유이며, **현재 해설**은 지금 코드의 이점·대안을 설명한 것이다. 과거 이유가 기록되지 않았으면 현재 설명을 당시의 판단으로 바꾸어 적지 않는다. **후속 학습**은 아직 구현·선택하지 않은 내용이다. 아래 연습은 제안이며 사용자의 수행·이해가 확인됐다는 뜻이 아니다.

작업 상태·완료 기준은 [PLAN](../PLAN.md), 제품 동작은 [PRD](PRD.md), 실제 수행 결과는 로컬 `docs/WORKLOG.md`, 실행 명령은 [README](../README.md)에서 관리한다. 학습 설명은 이 문서에서 누적하므로 새 채팅에서도 이어 읽을 수 있다.

## 읽는 순서

1. 아래 기술 역할 표로 언어·프레임워크·실행 환경·빌드 도구를 구별한다.
2. P10 Java 코드·어노테이션 설명부터 읽고 애플리케이션 시작·DB·health까지 실제 파일을 따라간다.
3. P03·P04 설명으로 React와 Next.js, TypeScript의 역할을 구별한다.
4. P05·P06 설명에서 제품 요구사항이 데이터 모델·검증에 어떤 영향을 주는지 살핀다.
5. 다음 기능을 시작할 때 해당 PLAN 번호의 후속 학습을 읽고, 구현 뒤 실제 코드 설명으로 보완한다.

모르는 용어는 해당 기능을 읽는 데 필요한 만큼 먼저 익힌다. Java에서는 객체·메서드·컬렉션·예외, JavaScript/TypeScript에서는 객체·배열·함수·비동기 요청이 출발점이다. 모든 기술을 먼저 숙달해야 개발을 시작할 수 있는 것은 아니다.

## 기술별 역할

| 구분 | 현재 사용 기술 | 맡는 일과 읽을 파일 |
|---|---|---|
| 백엔드 언어 | Java | 처리 규칙을 작성한다. [시작 클래스](../backend/src/main/java/kr/nadeulirang/backend/NadeulirangApplication.java) |
| 개발과 실행 환경 | JDK 21 | Java를 컴파일하고 실행한다. [세션 환경 적용](../scripts/use-local-env.ps1) |
| 백엔드 프레임워크 | Spring Boot | 웹 서버·DB 연결 등의 구성을 의존성과 설정에 맞춰 준비한다. [pom.xml](../backend/pom.xml) |
| 빌드 도구 | Maven Wrapper | 라이브러리·플러그인을 받아 컴파일·테스트·JAR 생성을 실행한다. [Wrapper 버전 설정](../backend/.mvn/wrapper/maven-wrapper.properties) |
| DB | PostgreSQL | 데이터를 지속적으로 저장하고 SQL로 조회한다. [연결 설정](../backend/src/main/resources/application.properties) |
| DB 변경 관리 | Flyway | SQL 변경을 버전별로 적용하고 이력을 검사한다. [초기 마이그레이션](../backend/src/main/resources/db/migration/V1__initialize_schema.sql) |
| 프론트 언어 | TypeScript | 화면과 상호작용을 작성하면서 타입 오류를 검사한다. [타입 설정](../frontend/tsconfig.json) |
| 화면 라이브러리 | React | 컴포넌트·props·state로 UI와 데이터 흐름을 구성한다. [현재 페이지](../frontend/src/app/page.tsx) |
| 프론트 프레임워크 | Next.js | React에 페이지·레이아웃·렌더링 등의 실행 구조를 제공한다. [현재 레이아웃](../frontend/src/app/layout.tsx) |
| 프론트 환경과 패키지 관리 | Node.js·npm | 개발 서버·검사 도구를 실행하고 패키지를 설치한다. [프론트 패키지 설정](../frontend/package.json) |

Kotlin은 Java와 비교할 수 있는 언어, Gradle은 Maven과 비교할 수 있는 빌드 도구다. 현재 프로젝트는 Java·Maven을 사용하며 Kotlin·Gradle을 추가할 필요가 있는 상황은 확인되지 않았다. IDE는 코드 편집·실행·디버깅을 돕는 도구다. 현재 빌드·테스트는 터미널과 Wrapper로 수행할 수 있고 IDE별 디버깅 설정은 준비한 범위에 포함되지 않는다.

## 기존 작업의 이유와 효과

### P01 P08 P09 실행 환경을 먼저 확인한 이유

**기록된 근거:** [PLAN](../PLAN.md#백엔드-기본-환경)과 [README](../README.md#백엔드-개발-환경)는 실제 실행 버전·DB 접속을 확인하고 프로젝트 전용 실행 파일·데이터를 `.local/`에 두도록 정리했다. 환경 적용은 현재 세션으로 제한하고 실제 접속 정보는 Git에서 제외한다.

**현재 해설:** 소스 코드가 같아도 JDK·패키지·DB 상태가 다르면 결과가 달라질 수 있다. 환경을 먼저 확인하면 코드 오류와 설치·접속 오류를 구별하기 쉽다. 프로젝트 전용 환경은 시스템 설정과 다른 프로젝트에 영향을 줄일 수 있지만 새 터미널마다 적용하고 DB를 시작해야 하는 비용이 있다. 시스템 설치·컨테이너도 가능한 대안이며 모든 환경에서 로컬 ZIP 방식이 가장 좋은 것은 아니다.

[use-local-env.ps1](../scripts/use-local-env.ps1)은 `JAVA_HOME`·PATH와 허용된 DB 변수만 현재 프로세스에 전달한다. [local-db.ps1](../scripts/local-db.ps1)은 기존 데이터 폴더를 이용해 시작·종료·상태를 관리한다. JDK 위치를 알려주는 일과 PostgreSQL 프로세스를 시작하는 일은 별개다.

확인은 README의 버전·DB 상태 명령을 따른다. 선택적 연습으로 새 터미널에서 환경 적용 전후의 `java -version` 결과를 비교하고, JDK가 준비돼 있어도 DB가 중지돼 있으면 접속이 실패하는 이유를 설명해 본다. 데이터 폴더나 접속 정보를 삭제하는 실험은 하지 않는다.

### P03 P04 React와 Next.js를 구별해서 읽기

**기록된 근거:** 기술 구성은 React 기반 Next.js·TypeScript이며 P03·P04에서 기본 프로젝트·실행·lint·타입 검사·빌드를 확인했다. React·Next.js·TypeScript 각각의 최초 선택 이유를 상세 비교한 당시 기록은 없다. 현재 페이지는 기본 화면이며 제품 화면 구현은 P13의 범위다.

**현재 해설:** 이 프로젝트의 React 컴포넌트는 UI의 한 부분을 표현하는 함수다. props는 전달받는 입력, state는 상호작용에 따라 바뀌는 기억이다. 컴포넌트를 나누고 최소한의 상태를 어디에 둘지 판단하면 데이터 흐름과 수정 범위를 이해하기 쉽다. 컴포넌트를 너무 잘게 나누거나 계산 가능한 값까지 state로 중복 저장하면 관리가 복잡해질 수 있다. [React 공식 설명](https://react.dev/learn/thinking-in-react)

[page.tsx](../frontend/src/app/page.tsx)의 `Home`은 기본 UI를 반환하고 [layout.tsx](../frontend/src/app/layout.tsx)의 `RootLayout`은 공통 문서 구조를 감싼다. Next.js App Router의 페이지·레이아웃은 기본적으로 Server Component이며, 사용자 이벤트·브라우저 API 등이 필요한 영역에는 Client Component 경계를 둔다. 이는 Spring 백엔드의 Java 코드와 다른 실행 영역이다. 현재 화면에 검색 state·백엔드 데이터 연결이 구현됐다는 뜻은 아니다. [Next.js 공식 설명](https://nextjs.org/docs/app/getting-started/server-and-client-components)

[tsconfig.json](../frontend/tsconfig.json)의 `strict`는 타입 검사를 엄격하게 적용한다. 다만 TypeScript 타입만으로 외부 API의 실제 응답이나 데이터의 정확성을 보증할 수는 없다. Vite 기반 React 구성도 가능한 대안이며, Next.js를 사용하면 라우팅·서버 렌더링 등의 규칙도 함께 공부해야 한다. 검색 유입 요구사항은 [P14](../PLAN.md#기능과-공개-준비)에서 검증한다.

확인은 [프론트 검사 명령](../README.md#프론트-검증)을 따른다. 선택적 연습으로 `Home`이 반환하는 요소와 `RootLayout`의 `children`이 만나는 위치를 찾아본다. 추후 검색 화면에서는 검색어와 검색 결과 중 무엇을 state로 보관할지 먼저 예상해 본다.

### P05 제품 범위를 먼저 정한 이유

**기록된 근거:** [PRD](PRD.md#첫-공개-범위)에서 검색·상세·최대 3곳 비교를 첫 공개 범위로 정하고 개인별 예상 합계는 후속으로 뒀다. 확인되지 않은 요금·운영 정보를 무료·방문 가능으로 추정하지 않는 기준도 확정했다.

**현재 해설:** 요구사항은 화면 목록을 넘어서 데이터와 조건문을 결정한다. 요금을 0과 미확인으로 구별해야 한다면 저장 모델과 필터가 그 차이를 보존해야 한다. 조건을 URL에 유지해야 한다면 화면의 state와 URL 중 어디를 기준으로 삼을지도 정해야 한다. 범위를 좁히면 먼저 검증할 흐름이 분명해지지만 후속 기능은 제공할 수 없다. 모든 기능을 한 번에 만드는 대안은 판단·검증해야 할 경우의 수를 늘린다.

아직 이 요구사항을 처리하는 검색·비교 코드가 구현된 것은 아니다. 현재 확인할 대상은 [PRD의 정보와 계산 기준](PRD.md#정보계산-기준)이다. 선택적 연습으로 일반 입장료 0원·요금 누락·조건부 무료가 검색 필터에서 어떻게 달라야 하는지 예를 들어 설명한다. 정한 규칙은 P11~P13 구현의 테스트 사례로 연결한다.

### P06 원천 표본과 실패 처리를 먼저 검증한 이유

**기록된 근거:** [원천 검토](DATA_SOURCES.md#p11-수집-기준)는 종류·지역 매핑, 중복·회차·요금 충돌, 출처·시각 보존과 정상 0건/실패의 구별을 수집 기준으로 정리했다. API 조회 성공은 기관의 당일 운영 확인과 구분한다.

**현재 해설:** 외부 데이터는 같은 의미를 다른 구조로 표현하거나 필드를 누락할 수 있다. 표본을 먼저 읽으면 잘못된 가정으로 테이블과 화면을 만드는 위험을 줄일 수 있다. 원천 값을 보존하면 나중에 변환 오류·충돌 원인을 다시 확인할 수 있지만 저장량과 해석 작업이 늘어난다. 원천 응답을 그대로 화면에 전달하는 방식은 단순한 대신 제품 분류·누락·실패 기준을 일관되게 적용하기 어렵다.

[verify-tourapi.mjs](../scripts/verify-tourapi.mjs)의 `buildUrl`은 요청 조건을 제한하고 `summarizeResponse`는 상태·본문을 검사한다. [verify-standard-data.mjs](../scripts/verify-standard-data.mjs)의 `summarizeStandardResponse`는 다른 원천 형식을 처리한다. 이 Node.js 도구들은 P06 표본 검증용이며 Spring의 실제 수집 기능은 P11에서 구현한다. 원천을 다시 호출하지 않아도 [도구 테스트](../tests/tooling/tourapi-validation.test.mjs)를 읽으며 실패와 빈 결과의 차이를 공부할 수 있다.

확인은 README의 도구 테스트 명령을 따른다. 선택적 연습으로 HTTP 200인데 원천 결과 코드가 오류인 응답, 정상 응답의 0건, 본문 손상 사례가 각각 어떤 결과여야 하는지 먼저 적고 테스트와 비교한다. 인증키·실제 접속 정보는 학습 예제에 적지 않는다.

### P07 디자인 기준선을 먼저 정한 이유

**기록된 근거:** [DESIGN의 방향 선택](../DESIGN.md#방향-선택)은 첫 공개 시나리오에서 일정·요금·출처를 반복 비교하기에 적합하다는 이유로 정보 중심 방향을 채택했다. 기본 프로젝트 실행 성공과 디자인 채택은 구분돼 있다.

**현재 해설:** 데이터가 준비되기 전에 화면의 읽는 순서와 공통 스타일을 정하면 구현할 때 항목·상태 표현을 맞추기 쉽다. 실제 긴 이름·누락·오류·모바일 조건에서는 기준선을 보완해야 하므로 P13의 구현 검증이 필요하다. 스타일만 적용한 기본 화면으로 제품 시나리오를 검증할 수는 없다.

선택적 연습으로 같은 카드에서 일반 요금·추가 요금·출처·미확인 표시를 어떤 순서로 읽어야 하는지 PRD와 대조한다. 이 기록은 기존 선택을 설명하며 새로운 디자인이나 스타일 변경을 채택하지 않는다.

### P10 Java 시작 코드를 문법부터 읽기

**기록된 근거:** 현재 백엔드 Java 소스는 [시작 클래스](../backend/src/main/java/kr/nadeulirang/backend/NadeulirangApplication.java)와 [통합 테스트](../backend/src/test/java/kr/nadeulirang/backend/NadeulirangApplicationTests.java)다. 제품의 수집·조회 클래스는 아직 없으므로 이 두 파일로 언어의 기본을 읽는다.

시작 클래스의 핵심은 다음과 같다. 기존 코드의 발췌이며 새 기능이나 실행 과제가 아니다.

```java
@SpringBootApplication
public class NadeulirangApplication {
    public static void main(String[] args) {
        SpringApplication.run(NadeulirangApplication.class, args);
    }
}
```

| 실제 표현 | Java에서 읽는 뜻 |
|---|---|
| `package kr.nadeulirang.backend;` | 이 클래스가 속한 이름 공간이다. 서로 다른 패키지에서 같은 클래스 이름을 사용할 수 있다. |
| `import ...SpringApplication;` | 다른 패키지의 타입을 짧은 이름으로 참조한다. import 자체가 서버를 실행하거나 객체를 만들지는 않는다. |
| `public class NadeulirangApplication` | 외부에서 참조할 수 있는 클래스를 선언한다. 클래스는 객체의 타입·구조·동작을 정의하고 객체는 그 타입의 인스턴스다. 이 시작 코드는 `new`로 인스턴스를 먼저 만들 필요가 없다. |
| `public static void main(...)` | 메서드 선언이다. `public`은 접근 범위, `static`은 인스턴스 없이 클래스에 속한 메서드, `void`는 반환값이 없다는 뜻이다. `main`은 현재 Java 실행 진입점이다. |
| `String[] args` | `String` 배열 타입의 매개변수 `args`다. 실행할 때 전달받은 인수를 이 이름으로 사용한다. `[]`는 배열이며 `List<String>` 같은 컬렉션과 다른 타입이다. |
| `SpringApplication.run(...)` | 클래스에 속한 `run` 메서드를 호출한다. 괄호 안은 전달할 인수다. 이 호출부터 Spring Boot의 시작 처리가 진행된다. |
| `NadeulirangApplication.class` | 이 타입을 나타내는 `Class` 객체를 전달한다. `new NadeulirangApplication()`으로 만든 앱 인스턴스와 다르다. |
| `{ ... }`, `;` | 중괄호는 클래스·메서드의 몸체 범위를 감싸고 세미콜론은 이 코드의 선언·호출 문장을 끝낸다. |

**현재 해설:** 클래스 선언과 객체 생성, 메서드 선언과 호출을 구별하면 누가 언제 실행하는지 추적할 수 있다. 객체마다 상태가 필요한 메서드는 인스턴스와 연결하고 `static` 메서드는 클래스와 연결한다. 모든 메서드를 `static`으로 만드는 방식은 객체의 상태·의존성을 다루는 설계와 맞지 않을 수 있다. 관련 문법은 [Java 21 클래스·필드·메서드 명세](https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html)에서 확인할 수 있다.

테스트의 `private JdbcTemplate jdbc;`도 세 부분으로 읽는다. `private`는 접근 범위, `JdbcTemplate`은 타입, `jdbc`는 필드 이름이다. `jdbc.queryForObject(...)`는 필드가 참조하는 객체의 메서드를 호출한다. `@Autowired`가 이 필드에 객체를 연결하는 부분은 Java의 변수 선언과 별도로 Spring이 처리한다. 타입을 선언했다고 DB 접속 객체가 자동으로 생기는 것은 아니다.

선택적 연습으로 `main`에서 메서드 선언·호출·매개변수·인수를 각각 표시하고, `static`이 있어서 어떤 인스턴스 생성 없이 호출할 수 있는지 설명해 본다. 힌트는 `SpringApplication.run`의 점 왼쪽과 테스트의 `jdbc.queryForObject`의 점 왼쪽을 비교하는 것이다. 서버 코드를 바꾸거나 연습 답을 제출해야 다음 작업을 진행하는 절차는 없다.

시작 코드를 읽은 뒤에는 같은 테스트 파일에서 다음 표현을 하나씩 찾아본다. 처음부터 모두 외우는 목록이 아니라 코드가 나올 때 돌아올 설명이다.

| 실제 테스트 표현 | Java 문법과 이 코드의 역할 |
|---|---|
| `private static final String TEST_SCHEMA = ...` | 클래스에 속한 `String` 필드를 초기화하고 다시 대입하지 못하게 한다. `final`만으로 모든 객체의 내부 상태까지 불변이 되는 것은 아니다. 여기서는 한 실행의 스키마 이름을 유지한다. |
| `() -> TEST_SCHEMA` | 매개변수 없이 스키마 이름을 반환하는 람다다. 지금 문자열을 반환하는 호출문이 아니라, 설정 등록 API가 필요할 때 호출할 함수를 전달한다. |
| `var health = client.send(...)` | 초기값을 기준으로 지역 변수의 타입을 컴파일러가 추론한다. 타입이 사라지거나 아무 값이나 넣을 수 있는 변수가 되는 것은 아니다. 여기서는 HTTP 응답 객체를 받는다. |
| `throws Exception` | 메서드에서 예외가 호출자에게 전달될 수 있음을 선언한다. 예외를 잡거나 무시하는 코드가 아니다. HTTP 호출 실패가 테스트 실패로 드러나게 한다. |
| `try (HttpClient client = ...) { ... }` | 자원을 선언하는 try-with-resources다. 블록을 벗어날 때 `close()`를 호출한다. 현재 Java 21의 `HttpClient`를 사용 후 닫으며 `catch` 없이도 자원 정리가 가능하다. |

람다는 [Java 21 람다 명세](https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.27), 타입 추론·자원 정리는 [Java 21 지역 변수·try 명세](https://docs.oracle.com/javase/specs/jls/se21/html/jls-14.html)에서 확인할 수 있다. 선택적 연습으로 `throws`가 오류를 처리하는지, `final`과 `var`가 각각 무엇을 제한·추론하는지 말로 구별한다. 힌트는 예외 처리·변수 재대입·타입 추론이 서로 다른 역할이라는 점이다.

### P10 골뱅이 어노테이션은 누가 해석하는가

**현재 해설:** `@이름`은 Java의 어노테이션 문법이다. 클래스·필드·메서드 등에 정보를 붙이고 컴파일러·도구·프레임워크가 그 정보를 읽어 처리한다. 어노테이션 자체가 메서드를 호출하는 실행문은 아니다. 종류에 따라 컴파일 때만 쓰이거나 실행 중에도 읽을 수 있으므로 모든 어노테이션의 동작 시점이 같지는 않다. [Java 21 어노테이션 명세](https://docs.oracle.com/javase/specs/jls/se21/html/jls-9.html#jls-9.7)

**기록된 근거:** 아래 표는 현재 시작 클래스·테스트에 실제로 붙은 어노테이션이다. 파일 위의 import를 보면 어떤 라이브러리가 정의했는지 알 수 있다.

| 실제 어노테이션·대상 | 읽는 도구와 역할 | 현재 코드에서 쓰는 이유 |
|---|---|---|
| `@SpringBootApplication` · 시작 클래스 | Spring Boot. 구성 클래스 표시·자동 구성·컴포넌트 탐색을 묶는다. 기본 탐색 범위는 이 클래스의 패키지와 하위 패키지다. | 의존성·설정에 따라 앱을 구성하는 출발점을 지정한다. |
| `@SpringBootTest(webEnvironment = ...RANDOM_PORT)` · 테스트 클래스 | Spring 테스트 지원. 실제 애플리케이션 컨텍스트와 임의 포트의 웹 서버를 준비한다. | DB·마이그레이션과 실제 HTTP 요청을 함께 검사한다. |
| `@Autowired` · `jdbc`, `flyway` 필드 | Spring 테스트 지원과 컨테이너. 관리하는 Bean을 테스트 필드에 주입한다. | 테스트가 이미 구성된 DB 접근·Flyway 객체를 사용한다. |
| `@LocalServerPort` · `port` 필드 | Spring Boot 테스트 지원. 실제 할당된 서버 포트를 넣는다. | 테스트가 고정된 8080이나 다른 실행 앱에 요청하지 않도록 한다. |
| `@DynamicPropertySource` · `isolatedSchema` 메서드 | Spring 테스트 지원. 컨텍스트 준비에 사용할 동적 설정을 등록한다. | 이번 실행의 UUID 스키마를 JDBC·Flyway에 지정한다. |
| `@Test` · 세 검사 메서드 | JUnit. 테스트할 메서드를 표시한다. | 테스트 도구가 일반 메서드와 검사를 구별한다. |
| `@DisplayName("...")` · 검사 메서드 | JUnit. 결과에 표시할 설명을 지정한다. | 한국어로 검사 목적을 읽게 한다. 검사 내용 자체는 바꾸지 않는다. |
| `@TestInstance(...PER_CLASS)` · 테스트 클래스 | JUnit. 테스트 클래스당 하나의 인스턴스를 사용한다. | 비정적 `@AfterAll` 메서드에서도 주입받은 `jdbc`를 사용할 수 있다. |
| `@AfterAll` · `removeTestSchema` 메서드 | JUnit. 해당 클래스의 테스트를 마친 뒤 정리 메서드를 실행한다. | 이번 실행에서 만든 테스트 스키마만 삭제한다. 강제 종료 시 실행 보장은 없다. |

`@SpringBootTest(webEnvironment = ...)`의 괄호는 어노테이션의 설정 값이며 테스트 메서드에 넘기는 일반 인수가 아니다. 어노테이션 이름뿐 아니라 대상·설정 값·해석하는 도구를 함께 읽어야 한다. [Spring Boot 구성 설명](https://docs.spring.io/spring-boot/reference/using/using-the-springbootapplication-annotation.html), [JUnit 어노테이션 설명](https://docs.junit.org/6.1.3/writing-tests/annotations.html)

필드 주입은 현재 통합 테스트의 선택이다. 제품 클래스에서 필요한 객체를 생성자의 매개변수로 받는 생성자 주입도 가능한 대안이다. Spring이 관리하는 클래스에 생성자가 하나라면 `@Autowired` 없이 그 생성자를 사용할 수 있다. 따라서 모든 의존성에 반드시 골뱅이를 붙이는 규칙은 아니다. 제품 클래스의 실제 형태는 P11·P12에서 선택하고 기록한다. [Spring 주입 설명](https://docs.spring.io/spring-framework/reference/core/beans/annotation-config/autowired.html)

선택적 연습으로 `@Test`·`@Autowired`의 import가 각각 어디에서 오는지 찾아보고, `@DisplayName`의 문구만 바꾸면 HTTP 응답이 바뀌는지 예상한다. 힌트는 응답 검사를 수행하는 메서드 몸체와 결과 설명을 붙이는 어노테이션의 역할을 구별하는 것이다.

### P10 Spring Boot가 시작될 때 일어나는 일

**기록된 근거:** [README](../README.md#백엔드-실행검증)는 새 프로젝트의 안정판과 Java 21 지원, 단일 프로젝트의 표준 빌드 흐름·Windows/Linux 실행을 기준으로 Spring Boot 4.1.1·Maven Wrapper 3.9.16을 선택했다고 설명한다.

[NadeulirangApplication.java](../backend/src/main/java/kr/nadeulirang/backend/NadeulirangApplication.java)의 `main`이 `SpringApplication.run`을 호출한다. `@SpringBootApplication`은 Spring 구성을 시작하는 기준이다. Spring은 의존성과 설정에 맞춰 객체와 기능을 구성하며 애플리케이션에서 관리하는 객체를 Bean이라고 부른다. 객체가 다른 객체를 직접 만들기보다 필요한 객체를 전달받는 방식이 의존성 주입이다. 현재 테스트의 `@Autowired` 필드에서 `JdbcTemplate`·`Flyway`를 전달받는 예를 볼 수 있다.

현재 시작 흐름은 다음 파일을 따라 읽으면 된다.

1. [use-local-env.ps1](../scripts/use-local-env.ps1)이 DB 설정을 환경 변수로 전달한다. Spring이 루트 `.env`를 직접 읽는 구성은 아니다.
2. [pom.xml](../backend/pom.xml)의 MVC·JDBC·Flyway·Actuator 의존성과 [application.properties](../backend/src/main/resources/application.properties)가 웹 서버·DB 연결·마이그레이션·health 구성에 사용된다.
3. DB 연결 뒤 Flyway가 전용 스키마와 이력을 준비하고 V1을 적용한다. 초기 SQL은 스키마 설명을 기록하며 제품 테이블은 아직 만들지 않는다.
4. 웹 서버가 시작되고 `/actuator/health`로 상태를 확인할 수 있다. 이 엔드포인트는 Actuator가 제공하므로 별도의 사용자 작성 Controller가 없다.

**현재 해설:** 자동 구성은 기본 연결 코드를 줄여 주지만 어떤 의존성과 설정이 동작을 만드는지 확인해야 한다. 환경·설정을 바꾸면 같은 시작 코드에서도 동작이 달라진다. 수동 구성도 가능한 대안이며 현재 규모에서 모든 객체·웹 서버를 직접 구성하면 유지할 코드가 늘어난다. Kotlin·Gradle과의 비교는 가능한 대안에 대한 현재 설명이며 별도 채택 결정은 없다.

확인은 README의 백엔드 실행·검증 명령을 따른다. 선택적 연습으로 MVC·JDBC·Flyway·Actuator가 각각 어떤 기능을 담당하는지 `pom.xml`에서 찾아보고, health를 처리하는 사용자 작성 메서드를 찾을 수 없는 이유를 설명한다.

### P10 Flyway와 전용 스키마를 사용한 이유

**기록된 근거:** [연결 설정](../backend/src/main/resources/application.properties)은 JDBC와 Flyway에 같은 `nadeulirang` 스키마를 지정하고 SQL 자동 초기화를 끈다. `clean-disabled=true`로 Flyway의 스키마 정리를 금지한다. [V1](../backend/src/main/resources/db/migration/V1__initialize_schema.sql)은 제품 테이블을 P11로 남겨둔다.

**현재 해설:** 마이그레이션은 DB 구조 변경을 버전 파일로 남기는 방법이다. 이력을 함께 관리하면 어느 변경이 적용됐는지 확인하고 다른 환경에도 같은 순서로 적용하기 쉽다. 적용한 SQL을 고치면 기존 DB의 이력과 새 파일이 달라질 수 있으므로 다음 버전으로 변경을 추가한다. 여러 초기화 방식의 중복 사용을 피하는 것은 [Spring Boot 공식 초기화 안내](https://docs.spring.io/spring-boot/how-to/data-initialization.html)의 권장 방식과도 맞는다.

전용 스키마는 애플리케이션의 테이블·변경 이력을 구별하게 해 주지만 그 자체가 별도 DB나 권한 분리를 보장하지는 않는다. JDBC 기본 스키마도 일치시켜야 SQL이 의도한 위치의 테이블을 찾는다. `clean-disabled`는 Flyway 기능을 제한하며 직접 실행하는 `DROP` SQL까지 막는 설정은 아니다.

수동 SQL 적용은 시작하기 쉽지만 적용 이력을 따로 맞춰야 한다. Hibernate 자동 DDL도 가능한 대안이나 현재 JPA/Hibernate 저장 모델은 채택하지 않았다. P11에서 저장 접근 방식을 선택할 때 기능·복잡도·학습 비용을 비교한다.

선택적 연습으로 같은 앱을 다시 시작할 때 V1이 다시 실행돼야 하는지 예상하고, [migratesSchemaOnce](../backend/src/test/java/kr/nadeulirang/backend/NadeulirangApplicationTests.java)에서 재실행·이력 검사를 찾아본다. 적용된 V1이나 앱 데이터를 수정하는 실험은 하지 않는다.

### P10 health 주소와 404를 구별하기

**기록된 근거:** [README 실행 안내](../README.md#백엔드-실행검증)는 Spring의 기본 포트 8080과 `/actuator/health`를 사용한다. [테스트](../backend/src/test/java/kr/nadeulirang/backend/NadeulirangApplicationTests.java)의 `servesHealthWithoutDetails`도 이 경로를 요청한다. 프론트의 [app 폴더](../frontend/src/app)에는 `/api/health` 라우트가 없으며 [next.config.ts](../frontend/next.config.ts)에도 Spring으로 전달하는 rewrite 설정이 없다.

| 요청 주소 | 요청을 받는 서버·현재 동작 |
|---|---|
| `http://localhost:3000/api/health` | 기본 개발 포트의 Next.js. 해당 라우트·전달 설정이 없어 404다. |
| `http://localhost:8080/actuator/health` | 기본 포트의 Spring. 앱·DB가 정상일 때 200과 `{"status":"UP"}`이다. |
| `http://localhost:8080/api/health` | Spring이 실행 중이어도 현재 이 경로를 만들지 않았으므로 404다. |

**현재 해설:** URL은 서버 주소·포트·경로를 함께 읽는다. 브라우저에서 상대 주소 `/api/health`로 요청하면 현재 페이지의 서버로 간다. `npm run dev`는 Next.js만 시작하고 Spring·PostgreSQL을 함께 시작하지 않는다. `GET /api/health 404 ... (next.js: ...)` 로그는 Next.js가 처리한 요청에서 그 경로를 찾지 못했다는 뜻이며 Spring의 health 검사 결과와 구분해야 한다. 이 로그만으로 요청을 누가 만들었는지는 알 수 없다.

404는 응답한 서버에 그 경로가 없다는 뜻이다. 접속 거부·연결 실패는 서버 미실행·포트 등 연결 상태부터 확인한다. 올바른 health 경로의 503은 서버에 연결됐지만 health 상태가 정상으로 판정되지 않은 경우이며 DB 상태 등을 살펴야 한다. 현재 health는 Actuator가 제공하므로 사용자가 작성한 `/api/health` Controller는 없다. [Actuator 공식 설명](https://docs.spring.io/spring-boot/reference/actuator/endpoints.html)

확인은 [README](../README.md#백엔드-실행검증)의 DB·Spring 실행 뒤 `Invoke-RestMethod http://localhost:8080/actuator/health`로 한다. 테스트가 통과했다는 사실은 서버가 이후에도 계속 실행된다는 뜻은 아니다. 같은 프론트 주소에서 백엔드 health를 제공하는 프록시도 가능한 대안이지만 별도 전달·오류 처리 설정이 필요하다. 현재 연결은 구현하지 않았으며 학습 설명을 맞추기 위해 성공 값만 반환하는 라우트를 추가하지 않는다.

선택적 연습으로 위 세 주소의 서버·포트·경로를 표시하고, Spring을 끈 상태와 DB 장애 상태의 예상 결과를 비교해 본다. 힌트는 HTTP 상태 코드를 받았는지와 서버에 연결 자체가 됐는지를 먼저 구별하는 것이다.

### P10 실제 DB 테스트와 health의 역할

**기록된 근거:** [NadeulirangApplicationTests](../backend/src/test/java/kr/nadeulirang/backend/NadeulirangApplicationTests.java)는 실제 PostgreSQL을 사용한다. `@DynamicPropertySource`가 실행마다 만든 UUID 스키마를 설정에 전달하고 `@AfterAll`에서 그 스키마만 삭제한다. `RANDOM_PORT`와 Java `HttpClient`로 실제 HTTP 응답도 확인한다.

**현재 해설:** 실제 DB를 사용하면 PostgreSQL 접속·스키마·시간대·마이그레이션을 함께 검사할 수 있다. 대신 DB 실행·접속 환경이 필요하다. Mock은 외부 의존성을 대체한 가짜 객체로 특정 로직을 빠르게 검사하는 대안이고, 메모리 DB도 가능하지만 실제 PostgreSQL의 모든 동작을 검증하지는 않는다. 제품 로직이 생기면 단위 테스트와 DB 통합 테스트의 역할을 나눠 선택한다.

health는 애플리케이션과 연결된 구성요소의 상태를 확인하는 수단이다. 현재 설정은 상태만 공개하고 DB 상세·환경 설정 엔드포인트는 공개하지 않는다. health의 `UP`은 원천 데이터의 최신성이나 검색 기능의 정확성까지 보증하지 않는다. [Actuator 공식 설명](https://docs.spring.io/spring-boot/reference/actuator/endpoints.html)

선택적 연습으로 `connectsToPostgresql`, `migratesSchemaOnce`, `servesHealthWithoutDetails`가 각각 어떤 오류를 발견하고 무엇을 확인하지 못하는지 적어본다. 테스트 종료 시 UUID 스키마만 지우는 이유와 강제 종료·DB 장애 시 정리가 남을 수 있는 이유도 설명한다.

### P10 P16 P18 빌드와 검사를 나눈 이유

**기록된 근거:** [AGENTS의 커밋 규칙](../AGENTS.md#브랜치와-커밋)은 변경에 필요한 검사만 커밋 때 수행하고 전체 빌드는 기능 완료·PR 전 또는 CI에서 확인하도록 정리했다. 백엔드는 훅에서 `test`, CI에서 `verify`를 실행한다.

**현재 해설:** Maven의 `test`는 앞선 컴파일 단계와 테스트까지 수행한다. `verify`는 앞선 패키징과 검증 단계까지 진행하며 현재 Spring Boot 플러그인 구성은 실행 JAR을 만든다. `verify`라고 해서 프로젝트에 작성하지 않은 품질 검사까지 자동으로 생기는 것은 아니다. [Maven 공식 빌드 흐름](https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html)

[check-commit.mjs](../scripts/check-commit.mjs)는 스테이징한 경로로 프론트·백엔드·도구 검사 필요 여부를 정한다. [check-backend.mjs](../scripts/check-backend.mjs)는 Maven 테스트를 실행한다. [.github/workflows/ci.yml](../.github/workflows/ci.yml)은 새 PostgreSQL 서비스와 JDK로 백엔드 테스트·빌드를 수행해 로컬 환경에만 의존하지 않도록 한다.

검사를 나누면 커밋 대기 시간을 줄일 수 있지만 경로 분기가 잘못되면 필요한 검사를 놓칠 수 있다. 모든 검사를 매 커밋에 실행하는 대안은 단순하지만 비용이 늘어난다. 부분 스테이징을 차단하는 이유는 검사한 코드와 커밋될 코드가 달라지는 상황을 줄이기 위해서다. [훅 분기 테스트](../tests/tooling/commit-check.test.mjs)는 실패 차단·수정 후 통과·부분 스테이징·문서 변경을 임시 저장소에서 검사한다.

선택적 연습으로 README만 수정할 때와 백엔드 SQL을 수정할 때 각각 실행돼야 할 검사를 예상하고 코드의 분기와 비교한다. 훅·CI 성공과 사람의 리뷰가 확인하는 내용의 차이도 찾아본다.

### P02 P17 P19 P20 설명과 기록의 역할을 나눈 이유

**기록된 근거:** [AGENTS](../AGENTS.md#문서-역할)는 계획·제품 기준·디자인·실행 안내·실제 결과를 각각의 문서에서 관리한다. P17은 diff 자체 리뷰를, P19는 WORKLOG 로컬 보존을, P20은 검증·리뷰·훅 통과 후 자동 로컬 커밋을 정리했다. 원격 반영은 별도 요청 범위다.

**현재 해설:** 같은 완료 상태를 여러 문서에 복사하면 나중에 일부만 갱신돼 충돌할 수 있다. 담당 문서와 링크를 정하면 변경 위치가 분명해진다. WORKLOG는 이 환경의 실제 결과를 보존하고 커밋·PR은 공유할 변경 이유와 검증을 남긴다. 로컬 기록은 다른 PC에 자동으로 전달되지 않는 비용이 있으므로 학습 설명은 Git으로 관리하는 이 문서에 남긴다.

기존 작업의 이유는 `git show <커밋>`으로 코드와 본문을 함께 읽을 수 있다. 예를 들어 `git show 2465691 -- backend/pom.xml`은 백엔드 준비의 설정 변경을 보여준다. 커밋 메시지가 있어도 실제 코드·테스트와 맞는지 확인하는 자체 리뷰가 필요하다.

선택적 연습으로 새로운 실행 명령, 제품 규칙, 오늘 수행한 결과, 기술 선택 해설을 각각 어느 문서에 기록해야 하는지 구별한다. 새 채팅에서 코드를 설명할 때는 실행 결과를 상상해 채우지 않고 확인 가능한 자료를 연결한다.

## P11 데이터 모델·수집 구현에서 선택한 구조

2026-10-03 구현하고 실제 소량 수집까지 검증한 코드의 설명이다. 공개 후보의 확보 범위는 PLAN에서 관리하며, 이를 전국 데이터 확보나 사용자의 학습 완료로 해석하지 않는다.

### 원문과 제품 항목의 ID를 분리하기

**문제와 선택:** 한 박물관이 여러 API에 나오고 요금·주소·기준일이 다를 수 있다. 최신 조회 응답 하나로 모두 덮어쓰면 충돌 이유를 잃는다. [V2 마이그레이션](../backend/src/main/resources/db/migration/V2__collection_model.sql)은 `outing`의 내부 UUID, `source_record`의 원천별 키, `source_observation`의 원문/해시/기준일, `field_evidence`의 필드 값·출처·확인 시각을 분리한다. 기관 공식 공지의 별도 판단은 `outing_review`, 연결 변경은 `source_link_history`에 남긴다.

[Source](../backend/src/main/java/kr/nadeulirang/backend/collection/Source.java)의 `enum`은 Java 문법으로 고정된 세 원천과 endpoint·keyName·dailyBudget 등을 묶는다. 열거 상수마다 생성자에 다른 값을 전달한다. `Source.TOUR`는 문자열을 임의로 붙여 만든 주소가 아니라 선언한 원천 값이다. DB의 `source_record(source, source_key)` 유일 제약은 같은 원천 항목의 중복 생성을 막고 `outing.id`는 수집할 때 새로 바꾸지 않는다.

[CollectionStore.identity](../backend/src/main/java/kr/nadeulirang/backend/collection/CollectionStore.java)는 표준 시설의 이름·주소·기관을 정리해 연결 후보를 만든다. 주소의 괄호·공백은 정리하되 번지는 유지한다. 축제는 시작·종료일·장소도 넣어 다른 회차를 분리한다. 같은 이름만으로 기관이나 주소가 다른 시설을 합치지 않는다. `relink`는 검토한 연결에만 사용하고 이전/새 ID와 근거를 남긴다. 초기 교차 원천 연결은 P06에서 기관 소개로 확인한 두 시설로 제한했다.

**이점과 비용·대안:** 출처와 충돌을 다시 확인하고 내부 링크를 유지할 수 있지만 테이블·조회가 늘어난다. 원문 JSON만 저장하면 시작은 간단해도 필터·중복·출처 비교를 매번 다시 해석해야 한다. 정규화 값만 저장하면 조회가 간단해도 판단 근거를 잃는다. 지금은 원문 보존과 필요한 제품 필드를 함께 사용한다. 할인·운영 문장의 완전 자동 해석은 채택하지 않았다.

### JDBC 저장과 트랜잭션의 범위를 읽기

**문제와 선택:** 제품 항목만 저장되고 원문 저장이 실패하면 근거 없는 항목이 남을 수 있다. 기존 JDBC 의존성을 사용해 SQL을 직접 작성하고 `TransactionTemplate`으로 한 원천 행의 제품/원문/필드 저장을 묶었다. JPA를 추가하면 객체와 테이블 연결을 관리하는 대안이 되지만, 현재는 SQL·유일 제약·업데이트 범위를 먼저 읽을 수 있는 쪽을 선택했다. SQL을 직접 유지하고 실제 PostgreSQL에서 검증해야 하는 비용이 있다.

`CollectionStore`는 Java **클래스**다. `private final JdbcTemplate jdbc`는 필드이며, **생성자** `CollectionStore(JdbcTemplate jdbc, PlatformTransactionManager manager)`는 외부에서 받은 객체를 필드에 넣고 `TransactionTemplate`을 만든다. `ingest(...)`는 여러 매개변수를 받아 저장하는 **메서드**다. `transactions.executeWithoutResult(status -> { ... })`에서 `status -> { ... }`는 Java 람다 문법이고, 트랜잭션의 시작·커밋·실패 시 롤백은 Spring 라이브러리가 처리한다. DB 제약 위반 예외가 밖으로 전달되면 그 행의 저장을 되돌린다.

`@Repository`의 import는 `org.springframework.stereotype.Repository`이며 클래스에 붙인다. 애플리케이션 시작 때 Spring의 컴포넌트 탐색이 이 클래스를 빈 후보로 등록하고 필요한 생성자 인수를 제공한다. 어노테이션 자체가 SQL을 실행하는 것은 아니다. `JdbcTemplate.update(...)`를 호출할 때 실제 저장이 실행된다. SQL의 `?`와 뒤 인수는 값 바인딩이며 이름·주소를 SQL 문자열에 직접 붙이지 않는다.

호출 예산 `reserve`는 네트워크 요청 **전에 별도 트랜잭션으로 확정**한다. 이후 네트워크나 제품 저장에 실패해도 소비한 요청을 되돌리지 않는다. `source_call`은 시도·정상 0건·실패를 기록하고, `record_operation`은 공통·소개·반복의 성공/실패 시각을 따로 보존한다. 한 상세 요청 성공으로 다른 상세의 실패를 지우지 않는 이유다. 전체 수집을 하나의 트랜잭션으로 묶는 대안은 성공/실패가 단순해지지만 네트워크 대기 동안 잠금이 길어지고 한 오류로 모든 저장을 잃을 수 있다.

### 응답 타입·정책 메서드와 실행기의 역할

[SourceResponse](../backend/src/main/java/kr/nadeulirang/backend/collection/SourceResponse.java)는 Java `record`다. `String outcome`, `String code`, `JsonNode payload`, `List<JsonNode> rows`를 생성자 인수로 갖고 Java 컴파일러가 `outcome()`·`rows()` 같은 접근 메서드를 제공한다. `List<JsonNode>`는 JSON 행을 여러 개 담는 제네릭 컬렉션이고 `JsonNode`/`JsonMapper`는 Jackson 라이브러리 타입이다. Java 문법만으로 JSON 본문이 자동 해석되는 것은 아니다.

`parse`는 HTTP 상태·원천 결과 코드·본문 구조를 함께 확인한다. TourAPI `0000`과 표준 `00`이 정상이며 표준 `03`은 정상 데이터 없음으로 구분한다. 인증·한도 오류의 JSON/XML 코드도 검사하고 민감한 오류 원문을 저장하지 않는다. 성공 본문에 키가 되돌아오는 경우도 JSON 문자열을 해석한 뒤 제거한다. `CollectionPolicy.numericFee`는 빈 값·조건 문장을 `null`로 두고 명확한 숫자 `0`만 무료로 구분한다. `null`은 미확인을 표현하는 값이며 `0`과 다르다. 원천별 값이 충돌하면 일반 요금은 미확인이다. 과거 원문은 그대로 남긴다.

[SourceClient](../backend/src/main/java/kr/nadeulirang/backend/collection/SourceClient.java)는 공식 주소·매개변수·20건 상한·시간/본문 크기를 제한하고 요청을 수행한다. 원천별 PostgreSQL 세션 잠금은 동시에 실행한 수집도 직렬화하고, `CollectionStore.reserve`의 행 잠금은 같은 24시간 예산을 공유하게 한다. DB 연결이 필요한 비용이 있지만 프로세스 메모리의 카운터와 달리 재시작 때 예산이 초기화되지 않는다. `22` 등 중단 코드는 상태에 저장하고 재시도로 소모하지 않는다. `23`도 속도를 무작정 재추정해 즉시 반복하지 않고 다음 실행으로 미룬다.

[CollectionRunner](../backend/src/main/java/kr/nadeulirang/backend/collection/CollectionRunner.java)는 `ApplicationRunner` 인터페이스의 `run(ApplicationArguments)`를 구현한다. `@Component`는 `org.springframework.stereotype.Component`에서 가져와 클래스에 붙인다. `@ConditionalOnProperty`는 `org.springframework.boot.autoconfigure.condition.ConditionalOnProperty`에서 가져오며 `name="collection.run"`, `havingValue="true"` 설정을 Spring Boot가 시작 시 평가해 수집 빈의 등록 여부를 정한다. 등록된 실행기의 `run` 호출은 애플리케이션 초기화 후 Boot의 실행 흐름에서 수행된다. 일반 서버 실행에서는 수집하지 않으며 [수집 스크립트](../scripts/collect-data.ps1)가 해당 옵션을 전달한다. 실행기는 `.env`를 직접 읽되 코드로 평가하거나 원천 키를 명령 인수로 전달하지 않는다.

**확인 방법과 한계:** [정책 테스트](../backend/src/test/java/kr/nadeulirang/backend/collection/CollectionPolicyTests.java)는 종류·요금·서울 날짜 경계·응답 검증을, [저장 테스트](../backend/src/test/java/kr/nadeulirang/backend/collection/CollectionStoreTests.java)는 실제 PostgreSQL에서 중복·충돌·호출 예산·동시 예약·롤백·이관·갱신 정책을 검사한다. 같은 응답에 다른 기준일·요금의 중복 행이 있으면 최신 호출의 모든 값을 비교해 충돌을 남긴다. 정상 소개 0건은 과거 날짜를 현재 확인된 일정으로 계속 쓰지 않고 미확인으로 바꾸며, 원문은 보존한다. 실패 때 마지막 성공을 보존하는 처리와 다르다.

2026-10-03 실제 수집에서 시도 요청에 `lDongListYn=Y`를 넣으면 구·군부터 반환돼 20건에 서울만 담기는 문제가 드러났다. 기본 시도 조회와 주소를 대조해 고쳤고, 두 행사 표본의 축약 이름을 실제 정식 이름으로 보완했다. `needsDetails`는 원천 수정 시각과 상세 성공 기한을 비교해 재실행의 불필요한 상세 호출을 줄였다. 테스트 입력과 실제 API 결과는 구분하며 실제 공개 후보 범위는 PLAN의 P11에서 관리한다. 조회 API는 P12, 날짜별 운영 판단과 화면 시나리오는 P13에서 확인한다.

선택적 연습: `adultChrge`의 `""`, `"0"`, `"1000"`이 각각 어떤 요금 상태가 될지 예상하고 테스트와 비교한다. 서로 다른 원천의 1,000원과 3,000원을 연결했을 때 원문·일반 요금·내부 ID가 어떻게 되는지 찾아본다. 제품 코드를 바꾸지 않아도 테스트 입력과 기대값을 읽으며 확인할 수 있다.

## P22 작업 폴더와 비밀 설정의 수명을 분리하기

**문제와 선택:** `.env`는 Git에서 제외되므로 새 작업 폴더나 복제본에 따라오지 않는다. 2026-10-03 사용자 요청에 따라 API 키·DB 설정의 공통 파일을 사용자 홈 `.nadeulirang/.env`에 보관하고, 폴더별 비어 있지 않은 값만 덮어쓰도록 했다. 보관 명령과 실제 경로는 [README](../README.md#작업-폴더-사이의-로컬-설정-유지-p22)에서 관리한다. 작업 폴더는 일시적으로 바뀌어도 공통 파일은 같은 사용자 홈에 남는다.

[local-settings.mjs](../scripts/local-settings.mjs)의 `loadLocalSettings`와 [local-settings.ps1](../scripts/local-settings.ps1)의 `Get-NadeulirangLocalSettings`는 6개 변수만 읽는다. `CollectionRunner.readKeys(Path, Path)`는 Java의 `Map<String, String>`에 원천 키 3개만 담는다. 공통 파일을 먼저 순회한 뒤 폴더별 값을 순회하므로 같은 이름의 비어 있지 않은 값이 교체되고, 빈 값은 기존 공통 값에 영향을 주지 않는다. 파일 내용을 명령으로 평가하지 않으므로 비밀번호의 `$()`도 문자로 읽는다.

**이점·비용·대안:** 매번 키를 복사하지 않아도 되지만 공통 설정의 변경은 이를 상속하는 다른 작업 폴더에 영향을 준다. 다른 DB가 필요한 폴더는 자체 설정으로 구분한다. 파일 복사만 하는 대안은 기존 실행 코드를 유지할 수 있어도 값이 여러 사본에 남아 변경이 어긋나기 쉽다. 비밀 관리 서비스는 여러 PC·운영 환경의 권한과 교체를 관리하는 대안이지만 이번 로컬 작업에는 추가하지 않았다. 지금은 접근 권한을 제한한 로컬 파일이며 자동 동기화나 암호화 저장소를 구현한 것은 아니다.

**확인 방법:** [도구 테스트](../tests/tooling/local-settings.test.mjs)는 폴더 이동·빈 입력·폴더별 우선순위·문자 그대로 읽기와 Windows 보관 파일의 생성/갱신을 검사한다. [백엔드 설정 테스트](../backend/src/test/java/kr/nadeulirang/backend/collection/CollectionSettingsTests.java)는 공통 키 상속과 기존 폴더만 있는 경우를 검사한다. 실제 키와 파일 권한은 값을 출력하지 않는 별도 로컬 확인으로 검증한다. 선택적 연습으로 공통 `DB_URL`과 폴더별 `DB_URL`이 다를 때 어느 값을 사용할지 예상해 본다.

## 앞으로 작업하며 배울 내용

다음 표는 학습 연결 제안이다. 구현·기술 선택·사용자의 학습 완료를 의미하지 않는다. 기능 범위와 완료 조건은 기존 PLAN·PRD를 따른다.

| PLAN | 기능과 연결할 개념 | 구현 전에 비교할 선택 | 구현 뒤 찾아볼 근거 |
|---|---|---|---|
| P11 | Java 타입·객체·생성자·컬렉션·예외, 원천 응답 변환, 데이터 모델, DB 제약, 트랜잭션, 중복 방지 | JDBC/JPA 등 저장 접근, 원문·정규화 값의 분리, 저장 실패 범위 | 실제 Java 클래스·변환 메서드·컬렉션의 순회·저장 SQL/객체·중복/실패 테스트 |
| P12 | Java 인터페이스·매개변수·반환 타입·제네릭, 요청·응답 DTO, 의존성 주입, 조회 SQL, 오류 응답 | HTTP 처리·제품 규칙·저장 접근을 나눌 범위, 페이징·정렬 방식 | 실제 Controller·생성자·메서드 선언/호출과 요청부터 응답까지의 흐름 |
| P13 | 컴포넌트, props/state, URL 상태, 비동기 조회, 오류 UI | 상태를 둘 위치, Server/Client Component 경계, 데이터 조회 위치 | 실제 컴포넌트·Hook·API 연결·상태/URL 복원 검증 |
| P14 | HTML 렌더링, 메타데이터, 색인 정책 | 정적/동적 렌더링·갱신, canonical·sitemap 범위 | 실제 페이지 응답·메타데이터·색인 대상 검증 |
| P15 | 설정·운영 관측, 백업·복구 | 배포 환경·비용, 데이터 갱신과 장애 대응 | 실제 운영 설정·복구 검증과 확인한 이용 조건 |

## 이후 학습 기록 형식

기능을 구현하거나 중요한 구성을 바꿀 때 관련 주제를 이 문서에 보완한다. 과거 설명의 오해·오류를 발견하면 근거와 정정 이유를 적고, 별개의 주제는 PLAN 번호가 있는 새 항목으로 추가한다. 긴 실습·자료가 필요할 때만 별도 문서를 만들고 여기에서 연결한다.

각 항목은 다음 내용을 독자가 따라갈 수 있는 문장으로 작성한다. 아래는 기록 형식이며 아직 구현한 기능의 설명은 아니다.

- **문제와 목표:** 어떤 입력·실패·사용자 요구를 처리하는가.
- **선택과 근거:** 실제 선택은 무엇이고 근거가 기록·코드·공식 자료 중 어디에 있는가. 당시 이유가 없으면 현재 해설이라고 표시한다.
- **이점과 비용:** 바뀌는 동작, 줄어드는 문제, 늘어나는 복잡도·제약을 설명한다.
- **대안과 적용 조건:** 다른 방법과 그 방법을 택할 만한 조건을 비교한다. 미정 선택은 확정으로 쓰지 않는다.
- **실제 코드와 흐름:** 파일 링크·핵심 식별자로 입력부터 결과까지 연결한다. Java는 타입·변수·메서드 선언과 호출을 먼저 읽고 어노테이션의 출처·대상·설정·해석 주체를 설명한다. 언어 문법과 Spring/라이브러리의 처리를 구별하며 없는 파일·계층을 이미 구현했다고 적지 않는다.
- **확인 방법과 한계:** 관련 테스트·수동 확인을 소개하고 실제 결과는 PLAN·WORKLOG에 연결한다. 미실행은 구분한다.
- **선택적 연습:** 작은 변경·결과 예측·오류 찾기를 제안하고 확인할 근거·힌트를 제공한다. 실제 사용자가 한 결과만 수행 기록으로 남긴다.

사용자가 직접 구현하기로 한 부분은 힌트·리뷰로 지원한다. 일반 작업에서는 설명과 기록을 함께 진행하며 연습 답변을 기다리는 절차를 자동으로 만들지 않는다. 기능이 검증됐다는 사실과 사용자가 그 기능을 이해했는지는 별도로 확인한다.
