# 나들이랑 코드 학습

현재 저장소의 코드·설정·파일 구조를 읽고 작은 변경의 영향을 이해하기 위한 문서다. 파일의 역할, 핵심 문법과 식별자, 호출·데이터 흐름, 구현 선택의 이유와 확인 방법을 설명한다. Java 문법과 Spring/Jackson 등의 라이브러리 기능을 구별한다.

기획·공개 범위는 [PRD](PRD.md), 작업·완료 상태는 [PLAN](../PLAN.md), 실행 명령은 [README](../README.md), 실제 수행 결과는 로컬 docs/WORKLOG.md에서 관리한다. 관련 PLAN 번호는 구현을 찾는 참고 정보다. 아래 설명은 2026-10-05의 코드 기준이며 연습은 선택 사항이다.

## 읽는 순서

1. 기술별 역할과 폴더 구성에서 읽을 파일을 찾는다.
2. Java 시작 코드 → 어노테이션 → Spring 시작·DB 연결 흐름을 읽는다.
3. 수집 클래스의 타입·생성자·SQL·응답 처리를 따라간다.
4. 조회 컨트롤러 → DB 조회 → HTTP 응답과 프론트 페이지 → 화면 → 데이터·상태·팝업 흐름을 읽는다.
5. 관련 테스트의 입력과 기대값으로 변경의 영향을 확인한다.

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

## 실행 환경과 설정

관련 작업: P01·P08·P09·P22.

[use-local-env.ps1](../scripts/use-local-env.ps1)은 현재 PowerShell 프로세스의 JAVA_HOME·PATH와 DB 설정을 준비한다. [local-db.ps1](../scripts/local-db.ps1)은 PostgreSQL 프로세스를 관리한다. JDK 경로 설정과 DB 시작은 별개이며, 다른 터미널은 같은 프로세스의 환경을 자동 공유하지 않는다. 실제 위치와 준비 명령은 README를 따른다.

### 공통 설정과 폴더별 설정을 합치는 순서

**문제와 선택:** `.env`는 Git에서 제외되므로 새 작업 폴더나 복제본에 따라오지 않는다. API 키·DB 설정의 공통 파일을 사용자 홈 `.nadeulirang/.env`에 보관하고, 폴더별 비어 있지 않은 값만 덮어쓰도록 했다. 보관 명령과 실제 경로는 [README](../README.md#작업-폴더-사이의-로컬-설정-유지-p22)에서 관리한다. 작업 폴더는 일시적으로 바뀌어도 공통 파일은 같은 사용자 홈에 남는다.

[local-settings.mjs](../scripts/local-settings.mjs)의 `loadLocalSettings`와 [local-settings.ps1](../scripts/local-settings.ps1)의 `Get-NadeulirangLocalSettings`는 6개 변수만 읽는다. `CollectionRunner.readKeys(Path, Path)`는 Java의 `Map<String, String>`에 원천 키 3개만 담는다. 공통 파일을 먼저 순회한 뒤 폴더별 값을 순회하므로 같은 이름의 비어 있지 않은 값이 교체되고, 빈 값은 기존 공통 값에 영향을 주지 않는다. 파일 내용을 명령으로 평가하지 않으므로 비밀번호의 `$()`도 문자로 읽는다.

**이점·비용·대안:** 매번 키를 복사하지 않아도 되지만 공통 설정의 변경은 이를 상속하는 다른 작업 폴더에 영향을 준다. 다른 DB가 필요한 폴더는 자체 설정으로 구분한다. 파일 복사만 하는 대안은 기존 실행 코드를 유지할 수 있어도 값이 여러 사본에 남아 변경이 어긋나기 쉽다. 비밀 관리 서비스는 여러 PC·운영 환경의 권한과 교체를 관리하는 대안이지만 이번 로컬 작업에는 추가하지 않았다. 지금은 접근 권한을 제한한 로컬 파일이며 자동 동기화나 암호화 저장소를 구현한 것은 아니다.

**확인 방법:** [도구 테스트](../tests/tooling/local-settings.test.mjs)는 폴더 이동·빈 입력·폴더별 우선순위·문자 그대로 읽기와 Windows 보관 파일의 생성/갱신을 검사한다. [백엔드 설정 테스트](../backend/src/test/java/kr/nadeulirang/backend/collection/CollectionSettingsTests.java)는 공통 키 상속과 기존 폴더만 있는 경우를 검사한다. 실제 키와 파일 권한은 값을 출력하지 않는 별도 로컬 확인으로 검증한다. 선택적 연습으로 공통 `DB_URL`과 폴더별 `DB_URL`이 다를 때 어느 값을 사용할지 예상해 본다.

## Java와 Spring 시작 코드

관련 작업: P10.

### Java 시작 코드를 문법부터 읽기

[시작 클래스](../backend/src/main/java/kr/nadeulirang/backend/NadeulirangApplication.java)와 [통합 테스트](../backend/src/test/java/kr/nadeulirang/backend/NadeulirangApplicationTests.java)로 Java의 기본 표현을 읽는다. 실제 수집 클래스는 아래 데이터 모델·수집 절에서 이어 읽는다.

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

클래스 선언과 객체 생성, 메서드 선언과 호출을 구별하면 누가 언제 실행하는지 추적할 수 있다. 객체마다 상태가 필요한 메서드는 인스턴스와 연결하고 `static` 메서드는 클래스와 연결한다. 모든 메서드를 `static`으로 만드는 방식은 객체의 상태·의존성을 다루는 설계와 맞지 않을 수 있다. 관련 문법은 [Java 21 클래스·필드·메서드 명세](https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html)에서 확인할 수 있다.

테스트의 `private JdbcTemplate jdbc;`도 세 부분으로 읽는다. `private`는 접근 범위, `JdbcTemplate`은 타입, `jdbc`는 필드 이름이다. `jdbc.queryForObject(...)`는 필드가 참조하는 객체의 메서드를 호출한다. `@Autowired`가 이 필드에 객체를 연결하는 부분은 Java의 변수 선언과 별도로 Spring이 처리한다. 타입을 선언했다고 DB 접속 객체가 자동으로 생기는 것은 아니다.

선택적 연습으로 `main`에서 메서드 선언·호출·매개변수·인수를 각각 표시하고, `static`이 있어서 어떤 인스턴스 생성 없이 호출할 수 있는지 설명해 본다. 힌트는 `SpringApplication.run`의 점 왼쪽과 테스트의 `jdbc.queryForObject`의 점 왼쪽을 비교하는 것이다.

시작 코드를 읽은 뒤에는 같은 테스트 파일에서 다음 표현을 하나씩 찾아본다. 처음부터 모두 외우는 목록이 아니라 코드가 나올 때 돌아올 설명이다.

| 실제 테스트 표현 | Java 문법과 이 코드의 역할 |
|---|---|
| `private static final String TEST_SCHEMA = ...` | 클래스에 속한 `String` 필드를 초기화하고 다시 대입하지 못하게 한다. `final`만으로 모든 객체의 내부 상태까지 불변이 되는 것은 아니다. 여기서는 한 실행의 스키마 이름을 유지한다. |
| `() -> TEST_SCHEMA` | 매개변수 없이 스키마 이름을 반환하는 람다다. 지금 문자열을 반환하는 호출문이 아니라, 설정 등록 API가 필요할 때 호출할 함수를 전달한다. |
| `var health = client.send(...)` | 초기값을 기준으로 지역 변수의 타입을 컴파일러가 추론한다. 타입이 사라지거나 아무 값이나 넣을 수 있는 변수가 되는 것은 아니다. 여기서는 HTTP 응답 객체를 받는다. |
| `throws Exception` | 메서드에서 예외가 호출자에게 전달될 수 있음을 선언한다. 예외를 잡거나 무시하는 코드가 아니다. HTTP 호출 실패가 테스트 실패로 드러나게 한다. |
| `try (HttpClient client = ...) { ... }` | 자원을 선언하는 try-with-resources다. 블록을 벗어날 때 `close()`를 호출한다. 현재 Java 21의 `HttpClient`를 사용 후 닫으며 `catch` 없이도 자원 정리가 가능하다. |

람다는 [Java 21 람다 명세](https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.27), 타입 추론·자원 정리는 [Java 21 지역 변수·try 명세](https://docs.oracle.com/javase/specs/jls/se21/html/jls-14.html)에서 확인할 수 있다. 선택적 연습으로 `throws`가 오류를 처리하는지, `final`과 `var`가 각각 무엇을 제한·추론하는지 말로 구별한다. 힌트는 예외 처리·변수 재대입·타입 추론이 서로 다른 역할이라는 점이다.

### 골뱅이 어노테이션은 누가 해석하는가

`@이름`은 Java의 어노테이션 문법이다. 클래스·필드·메서드 등에 정보를 붙이고 컴파일러·도구·프레임워크가 그 정보를 읽어 처리한다. 어노테이션 자체가 메서드를 호출하는 실행문은 아니다. 종류에 따라 컴파일 때만 쓰이거나 실행 중에도 읽을 수 있으므로 모든 어노테이션의 동작 시점이 같지는 않다. [Java 21 어노테이션 명세](https://docs.oracle.com/javase/specs/jls/se21/html/jls-9.html#jls-9.7)

아래 표는 현재 시작 클래스·테스트에 실제로 붙은 어노테이션이다. 파일 위의 import를 보면 어떤 라이브러리가 정의했는지 알 수 있다.

| 실제 어노테이션·대상 | 읽는 도구와 역할 | 현재 코드에서 쓰는 이유 |
|---|---|---|
| `@SpringBootApplication` · 시작 클래스 | import는 `org.springframework.boot.autoconfigure.SpringBootApplication`. Spring Boot가 구성 클래스·자동 구성·컴포넌트 탐색 기준으로 읽는다. 기본 탐색 범위는 이 클래스의 패키지와 하위 패키지다. | 의존성·설정에 따라 앱을 구성하는 출발점을 지정한다. |
| `@SpringBootTest(webEnvironment = ...RANDOM_PORT)` · 테스트 클래스 | import는 `org.springframework.boot.test.context.SpringBootTest`. Spring 테스트 지원이 실제 컨텍스트와 임의 포트의 웹 서버를 준비한다. | DB·마이그레이션과 실제 HTTP 요청을 함께 검사한다. |
| `@Autowired` · `jdbc`, `flyway` 필드 | import는 `org.springframework.beans.factory.annotation.Autowired`. Spring 테스트 지원과 컨테이너가 관리하는 Bean을 주입한다. | 테스트가 이미 구성된 DB 접근·Flyway 객체를 사용한다. |
| `@LocalServerPort` · `port` 필드 | import는 `org.springframework.boot.test.web.server.LocalServerPort`. Spring Boot 테스트 지원이 실제 할당된 포트를 넣는다. | 고정된 8080이나 다른 실행 앱에 요청하지 않도록 한다. |
| `@DynamicPropertySource` · `isolatedSchema` 메서드 | import는 `org.springframework.test.context.DynamicPropertySource`. Spring 테스트 지원이 컨텍스트 준비에 사용할 동적 설정을 등록한다. | 이번 실행의 UUID 스키마를 JDBC·Flyway에 지정한다. |
| `@Test` · 세 검사 메서드 | JUnit. 테스트할 메서드를 표시한다. | 테스트 도구가 일반 메서드와 검사를 구별한다. |
| `@DisplayName("...")` · 검사 메서드 | JUnit. 결과에 표시할 설명을 지정한다. | 한국어로 검사 목적을 읽게 한다. 검사 내용 자체는 바꾸지 않는다. |
| `@TestInstance(...PER_CLASS)` · 테스트 클래스 | JUnit. 테스트 클래스당 하나의 인스턴스를 사용한다. | 비정적 `@AfterAll` 메서드에서도 주입받은 `jdbc`를 사용할 수 있다. |
| `@AfterAll` · `removeTestSchema` 메서드 | JUnit. 해당 클래스의 테스트를 마친 뒤 정리 메서드를 실행한다. | 이번 실행에서 만든 테스트 스키마만 삭제한다. 강제 종료 시 실행 보장은 없다. |

`@SpringBootTest(webEnvironment = ...)`의 괄호는 어노테이션의 설정 값이며 테스트 메서드에 넘기는 일반 인수가 아니다. 어노테이션 이름뿐 아니라 대상·설정 값·해석하는 도구를 함께 읽어야 한다. [Spring Boot 구성 설명](https://docs.spring.io/spring-boot/reference/using/using-the-springbootapplication-annotation.html), [JUnit 어노테이션 설명](https://docs.junit.org/6.1.3/writing-tests/annotations.html)

표의 JUnit 어노테이션은 각각 `org.junit.jupiter.api.Test`·`DisplayName`·`TestInstance`·`AfterAll`에서 import한다. Spring 구성은 애플리케이션 또는 테스트 컨텍스트를 준비할 때 읽히고, JUnit은 테스트 실행 시 검사와 인스턴스/종료 처리를 결정한다. `DisplayName`의 문자열은 표시할 검사 설명이며 HTTP 응답을 바꾸는 설정이 아니다.

필드 주입은 현재 통합 테스트의 선택이다. 제품 클래스에서 필요한 객체를 생성자의 매개변수로 받는 생성자 주입도 가능한 대안이다. Spring이 관리하는 클래스에 생성자가 하나라면 `@Autowired` 없이 그 생성자를 사용할 수 있다. 따라서 모든 의존성에 반드시 골뱅이를 붙이는 규칙은 아니다. 생성자 주입의 실제 예는 아래 CollectionStore에서 읽을 수 있다. [Spring 주입 설명](https://docs.spring.io/spring-framework/reference/core/beans/annotation-config/autowired.html)

선택적 연습으로 `@Test`·`@Autowired`의 import가 각각 어디에서 오는지 찾아보고, `@DisplayName`의 문구만 바꾸면 HTTP 응답이 바뀌는지 예상한다. 힌트는 응답 검사를 수행하는 메서드 몸체와 결과 설명을 붙이는 어노테이션의 역할을 구별하는 것이다.

### Spring Boot가 시작될 때 일어나는 일

읽을 파일은 시작 클래스, pom.xml의 의존성, application.properties의 설정이다. 실행 명령과 버전은 README를 따른다.

[NadeulirangApplication.java](../backend/src/main/java/kr/nadeulirang/backend/NadeulirangApplication.java)의 `main`이 `SpringApplication.run`을 호출한다. `@SpringBootApplication`은 Spring 구성을 시작하는 기준이다. Spring은 의존성과 설정에 맞춰 객체와 기능을 구성하며 애플리케이션에서 관리하는 객체를 Bean이라고 부른다. 객체가 다른 객체를 직접 만들기보다 필요한 객체를 전달받는 방식이 의존성 주입이다. 현재 테스트의 `@Autowired` 필드에서 `JdbcTemplate`·`Flyway`를 전달받는 예를 볼 수 있다.

현재 시작 흐름은 다음 파일을 따라 읽으면 된다.

1. [use-local-env.ps1](../scripts/use-local-env.ps1)이 DB 설정을 환경 변수로 전달한다. Spring이 루트 `.env`를 직접 읽는 구성은 아니다.
2. [pom.xml](../backend/pom.xml)의 MVC·JDBC·Flyway·Actuator 의존성과 [application.properties](../backend/src/main/resources/application.properties)가 웹 서버·DB 연결·마이그레이션·health 구성에 사용된다.
3. DB 연결 뒤 Flyway가 전용 스키마와 이력을 준비하고 미적용 마이그레이션을 순서대로 실행한다. V1은 스키마 설명, V2는 수집·제품 테이블, V3는 목록 배치의 중간 위치를 정의한다.
4. 웹 서버가 시작되고 `/actuator/health`로 상태를 확인할 수 있다. 이 엔드포인트는 Actuator가 제공하므로 별도의 사용자 작성 Controller가 없다.

자동 구성은 기본 연결 코드를 줄여 주지만 어떤 의존성과 설정이 동작을 만드는지 확인해야 한다. 환경·설정을 바꾸면 같은 시작 코드에서도 동작이 달라진다. 수동 구성도 가능한 대안이며 현재 규모에서 모든 객체·웹 서버를 직접 구성하면 유지할 코드가 늘어난다.

확인은 README의 백엔드 실행·검증 명령을 따른다. 선택적 연습으로 MVC·JDBC·Flyway·Actuator가 각각 어떤 기능을 담당하는지 `pom.xml`에서 찾아보고, health를 처리하는 사용자 작성 메서드를 찾을 수 없는 이유를 설명한다.

### Flyway와 전용 스키마를 사용한 이유

[연결 설정](../backend/src/main/resources/application.properties)은 JDBC와 Flyway에 같은 `nadeulirang` 스키마를 지정하고 SQL 자동 초기화를 끈다. `clean-disabled=true`로 Flyway의 스키마 정리를 금지한다. [V1](../backend/src/main/resources/db/migration/V1__initialize_schema.sql)은 스키마 설명을 기록하고 [V2](../backend/src/main/resources/db/migration/V2__collection_model.sql)는 제품·수집 테이블, [V3](../backend/src/main/resources/db/migration/V3__collection_checkpoint.sql)는 배치 위치 테이블을 만든다.

마이그레이션은 DB 구조 변경을 버전 파일로 남기는 방법이다. 이력을 함께 관리하면 어느 변경이 적용됐는지 확인하고 다른 환경에도 같은 순서로 적용하기 쉽다. 적용한 SQL을 고치면 기존 DB의 이력과 새 파일이 달라질 수 있으므로 다음 버전으로 변경을 추가한다. 여러 초기화 방식의 중복 사용을 피하는 것은 [Spring Boot 공식 초기화 안내](https://docs.spring.io/spring-boot/how-to/data-initialization.html)의 권장 방식과도 맞는다.

전용 스키마는 애플리케이션의 테이블·변경 이력을 구별하게 해 주지만 그 자체가 별도 DB나 권한 분리를 보장하지는 않는다. JDBC 기본 스키마도 일치시켜야 SQL이 의도한 위치의 테이블을 찾는다. `clean-disabled`는 Flyway 기능을 제한하며 직접 실행하는 `DROP` SQL까지 막는 설정은 아니다.

수동 SQL 적용은 시작하기 쉽지만 적용 이력을 따로 맞춰야 한다. Hibernate 자동 DDL도 가능한 대안이나 현재 JPA/Hibernate 저장 모델은 채택하지 않았다. 현재 저장 코드는 JDBC로 SQL을 직접 실행한다.

선택적 연습으로 같은 앱을 다시 시작할 때 V1이 다시 실행돼야 하는지 예상하고, [migratesSchemaOnce](../backend/src/test/java/kr/nadeulirang/backend/NadeulirangApplicationTests.java)에서 재실행·이력 검사를 찾아본다. 적용된 V1이나 앱 데이터를 수정하는 실험은 하지 않는다.

### health 주소와 404를 구별하기

[README 실행 안내](../README.md#백엔드-실행검증)는 Spring의 기본 포트 8080과 `/actuator/health`를 사용한다. [테스트](../backend/src/test/java/kr/nadeulirang/backend/NadeulirangApplicationTests.java)의 `servesHealthWithoutDetails`도 이 경로를 요청한다. 프론트의 [app 폴더](../frontend/src/app)에는 `/api/health` 라우트가 없으며 [next.config.ts](../frontend/next.config.ts)에도 Spring으로 전달하는 rewrite 설정이 없다.

| 요청 주소 | 요청을 받는 서버·현재 동작 |
|---|---|
| `http://localhost:3000/api/health` | 기본 개발 포트의 Next.js. 해당 라우트·전달 설정이 없어 404다. |
| `http://localhost:8080/actuator/health` | 기본 포트의 Spring. 앱·DB가 정상일 때 200과 `{"status":"UP"}`이다. |
| `http://localhost:8080/api/health` | Spring이 실행 중이어도 현재 이 경로를 만들지 않았으므로 404다. |

URL은 서버 주소·포트·경로를 함께 읽는다. 브라우저에서 상대 주소 `/api/health`로 요청하면 현재 페이지의 서버로 간다. `npm run dev`는 Next.js만 시작하고 Spring·PostgreSQL을 함께 시작하지 않는다. `GET /api/health 404 ... (next.js: ...)` 로그는 Next.js가 처리한 요청에서 그 경로를 찾지 못했다는 뜻이며 Spring의 health 검사 결과와 구분해야 한다. 이 로그만으로 요청을 누가 만들었는지는 알 수 없다.

404는 응답한 서버에 그 경로가 없다는 뜻이다. 접속 거부·연결 실패는 서버 미실행·포트 등 연결 상태부터 확인한다. 올바른 health 경로의 503은 서버에 연결됐지만 health 상태가 정상으로 판정되지 않은 경우이며 DB 상태 등을 살펴야 한다. 현재 health는 Actuator가 제공하므로 사용자가 작성한 `/api/health` Controller는 없다. [Actuator 공식 설명](https://docs.spring.io/spring-boot/reference/actuator/endpoints.html)

확인은 [README](../README.md#백엔드-실행검증)의 DB·Spring 실행 뒤 `Invoke-RestMethod http://localhost:8080/actuator/health`로 한다. 테스트가 통과했다는 사실은 서버가 이후에도 계속 실행된다는 뜻은 아니다. 같은 프론트 주소에서 백엔드 health를 제공하는 프록시도 가능한 대안이지만 별도 전달·오류 처리 설정이 필요하다. 현재 연결은 구현하지 않았으며 학습 설명을 맞추기 위해 성공 값만 반환하는 라우트를 추가하지 않는다.

선택적 연습으로 위 세 주소의 서버·포트·경로를 표시하고, Spring을 끈 상태와 DB 장애 상태의 예상 결과를 비교해 본다. 힌트는 HTTP 상태 코드를 받았는지와 서버에 연결 자체가 됐는지를 먼저 구별하는 것이다.

### 실제 DB 테스트와 health의 역할

[NadeulirangApplicationTests](../backend/src/test/java/kr/nadeulirang/backend/NadeulirangApplicationTests.java)는 실제 PostgreSQL을 사용한다. `@DynamicPropertySource`가 실행마다 만든 UUID 스키마를 설정에 전달하고 `@AfterAll`에서 그 스키마만 삭제한다. `RANDOM_PORT`와 Java `HttpClient`로 실제 HTTP 응답도 확인한다.

실제 DB를 사용하면 PostgreSQL 접속·스키마·시간대·마이그레이션을 함께 검사할 수 있다. 대신 DB 실행·접속 환경이 필요하다. Mock은 외부 의존성을 대체한 가짜 객체로 특정 로직을 빠르게 검사하는 대안이고, 메모리 DB도 가능하지만 실제 PostgreSQL의 모든 동작을 검증하지는 않는다. 현재 CollectionPolicyTests와 CollectionStoreTests에서 정책 단위 테스트와 실제 DB 저장 검사를 나눠 읽을 수 있다.

health는 애플리케이션과 연결된 구성요소의 상태를 확인하는 수단이다. 현재 설정은 상태만 공개하고 DB 상세·환경 설정 엔드포인트는 공개하지 않는다. health의 `UP`은 원천 데이터의 최신성이나 검색 기능의 정확성까지 보증하지 않는다. [Actuator 공식 설명](https://docs.spring.io/spring-boot/reference/actuator/endpoints.html)

선택적 연습으로 `connectsToPostgresql`, `migratesSchemaOnce`, `servesHealthWithoutDetails`가 각각 어떤 오류를 발견하고 무엇을 확인하지 못하는지 적어본다. 테스트 종료 시 UUID 스키마만 지우는 이유와 강제 종료·DB 장애 시 정리가 남을 수 있는 이유도 설명한다.

## 데이터 모델과 수집 코드

관련 작업: P06·P11.

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

`needsDetails`는 원천 수정 시각과 상세 성공 기한을 비교해 불필요한 상세 호출을 줄인다. 상세 호출을 줄이는 판단과 원천 데이터가 현재 운영을 보증하는지는 서로 다른 문제다.

선택적 연습: `adultChrge`의 `""`, `"0"`, `"1000"`이 각각 어떤 요금 상태가 될지 예상하고 테스트와 비교한다. 서로 다른 원천의 1,000원과 3,000원을 연결했을 때 원문·일반 요금·내부 ID가 어떻게 되는지 찾아본다. 제품 코드를 바꾸지 않아도 테스트 입력과 기대값을 읽으며 확인할 수 있다.

`parse`와 HTTP 응답 판정의 작은 예제는 [verify-tourapi.mjs](../scripts/verify-tourapi.mjs)의 summarizeResponse와 [도구 테스트](../tests/tooling/tourapi-validation.test.mjs)를 함께 본다. 이 Node.js 도구는 표본 확인용이며 실제 저장 흐름은 CollectionRunner → SourceClient → CollectionStore다.

### 목록 배치·커서와 검토 분리

관련 작업: P38. `CollectionRunner.collectBatch`는 행사·시설의 다섯 목록을 순회하고 실행 후보 상한을 나눠 처리한다. `Stream` record는 목록 이름·`Source` enum·오퍼레이션·조회 JSON을 전달한다. API가 반환한 페이지를 읽은 뒤 TourAPI 후보의 공통/소개/반복 또는 표준 행을 기존 저장소에 저장한다. 기존 검토 목록 외의 신규 후보는 `PENDING`이며 저장 성공과 공개 검토는 별개다. `CollectionStore.reviewedTour`는 승인된 TourAPI의 이름·종류·시도 코드를 `TourReview` record로 읽어 재조회 때 대조한다. 이름·종류·시도 주소가 그대로면 승인을 유지하고 바뀌면 재검토 대상으로 저장한다.

[CollectionCheckpointStore](../backend/src/main/java/kr/nadeulirang/backend/collection/CollectionCheckpointStore.java)의 `Cursor` record는 페이지 번호·행 위치·성공 `source_call` UUID·완료 여부를 갖는다. 생성자 인수는 Spring이 제공하는 `JdbcTemplate`·`DataSource`다. `V3__collection_checkpoint.sql`의 외래키로 성공 목록 원문을 참조해 부분 처리한 페이지는 다음 실행에서 같은 응답의 남은 행부터 읽는다. 행 저장 후 커서를 진행하므로 그 사이 중단돼도 원천별 유일 제약으로 제품 ID를 다시 만들지 않는다. 별도의 관측 이력은 남을 수 있다.

`withBatchLock`은 JDBC 연결이 살아 있는 동안 PostgreSQL 세션 잠금을 유지해 같은 배치 커서의 동시 변경을 막고 `finally`에서 해제한다. 이는 네트워크와 저장 전체를 하나의 트랜잭션으로 되돌리는 방식이 아니다. 각 성공 행과 요청 예산은 독립적으로 보존하며 상세 실패 후보는 같은 위치에 남는다. 원천의 월간 목록 변경은 페이지 위치에 영향을 줄 수 있어 최신 변경 전체를 추적하는 예약 갱신과 구분한다.

[CollectionBatchTests](../backend/src/test/java/kr/nadeulirang/backend/collection/CollectionBatchTests.java)는 원천 네트워크를 가짜 응답으로 대체하고 별도 PostgreSQL 스키마에서 위치 재개·실패 후 복구·후보 비공개·페이지 끝·기존 승인 보존과 변경 시 재검토를 검사한다. `SourceResponse.totalCount`는 TourAPI의 `response.body`와 표준 API의 직접 `body` 구조를 모두 읽어 20행이 전량이라고 오판하지 않는다. 실제 키 인증·전국 원문 수집은 로컬 수집 실행에서 별도로 확인한다. 선택적 연습으로 20행 중 19번째(0부터 시작)를 처리한 뒤 `total=20`과 `total=21`일 때 `next`의 완료 여부를 예상해 본다.

`collect-data.ps1`의 `Mode`·`MaxItems`·`Campaign` 매개변수는 Spring 실행 인수로 전달하고 원천 키는 기존 로컬 파일에서 읽는다. Windows PowerShell 5가 한국어 스크립트를 읽도록 파일에 UTF-8 BOM을 보존하고 Java의 표준 출력·오류 인코딩도 UTF-8로 지정한다. 이는 수집 프로세스 설정이며 PC의 영구 환경 설정을 바꾸지 않는다.

## 목록·상세 HTTP 조회와 공개 경계

관련 작업: P12. 요청 조건·응답 필드·호출 예시는 [백엔드 API 안내](../backend/README.md#목록상세-조회-api)를 따른다.

### 컨트롤러·생성자·응답 record를 읽기

목록 요청의 흐름은 HTTP GET `/api/outings` → [OutingController.list](../backend/src/main/java/kr/nadeulirang/backend/outing/OutingController.java) → `new OutingQuery(...)` → [OutingStore.list](../backend/src/main/java/kr/nadeulirang/backend/outing/OutingStore.java) → PostgreSQL → `OutingResponse.Page` → JSON 응답이다. 상세는 `detail(UUID id)`가 같은 공개 조건을 확인한 뒤 근거와 출처를 추가한다. 수집기를 호출하지 않으므로 방문자마다 외부 원천 호출 예산을 쓰지 않는다.

`OutingController`는 Java 클래스이며 `private final OutingStore store`와 `Clock clock`는 필드다. 생성자는 Spring이 전달한 조회 객체와 시계를 저장한다. `list(...)`는 문자열 조건·정수 페이지를 받아 `OutingResponse.Page`를 반환하는 메서드다. 외부 입력은 검증한 `OutingQuery`로 바꾼다. `record`의 간결한 생성자 `public OutingQuery { ... }`는 매개변수를 정리하고 허용하지 않은 값에 `IllegalArgumentException`을 던진다. `offset()`의 `(long) page`는 정수 곱셈 전에 64비트 값으로 바꿔 매우 큰 페이지 번호의 오버플로를 막는다.

[OutingResponse](../backend/src/main/java/kr/nadeulirang/backend/outing/OutingResponse.java)의 `Page`, `Summary`, `Detail` 등은 Java `record`다. `List<Summary>`는 목록 항목의 타입을 지정하고, `Map<String, List<Evidence>>`는 정보 그룹명에 여러 출처 근거를 연결한다. `UUID`·`LocalDate`·`Instant`·`BigDecimal`은 각각 식별자·달력 날짜·시각·십진수 금액을 표현하는 Java 타입이다. `adultFee == null`은 미확인이며 0원과 다르다. record가 JSON을 만드는 것은 아니며 Spring MVC의 응답 처리와 Jackson이 접근 메서드의 값을 JSON으로 직렬화한다.

`@RestController`, `@RequestMapping`, `@GetMapping`, `@RequestParam`, `@PathVariable`은 `org.springframework.web.bind.annotation`에서 가져온다. `@RestController`는 클래스, 나머지는 클래스/메서드/매개변수에 붙는다. Spring MVC가 시작 때 `/api/outings`와 GET 메서드의 연결을 등록하고, 요청 시 `defaultValue`와 매개변수 타입에 따라 조건을 읽는다. `/{id}`의 문자열은 `UUID`로 변환되며 올바르지 않으면 조회 전에 입력 오류가 발생한다. 어노테이션 자체가 DB 조회를 실행하는 것은 아니다. 요청을 처리하는 메서드가 `store.list(...)`·`store.detail(...)`를 호출할 때 실행된다.

### SQL 조회·날짜·한 응답의 일관성

`OutingStore`는 기존 `JdbcTemplate`로 SQL을 실행한다. 새 JPA 의존성이나 별도 서비스 계층은 추가하지 않았다. 현재는 조회 조합과 응답 변환이 한 클래스 안에서 확인 가능하며, 업무 규칙이 늘어나면 책임 분리를 다시 판단할 수 있다. SQL을 직접 유지하는 비용이 있다.

`CANDIDATES`는 Java 텍스트 블록에 저장한 SQL이다. PostgreSQL의 `WITH candidates AS (...)`는 이어지는 조회에서 사용할 임시 결과 이름이며 새 테이블을 저장하지 않는다. 승인·표출·허용 라이선스·실제 원문 존재 조건을 먼저 적용한다. 이후 목록은 `ENDED`·`CANCELLED`를 제외하고 상세는 ID 조건만 추가한다. 수집용 `public_candidate` 뷰는 취소를 제외하므로, 그대로 상세에 사용하면 공개 상세에서 취소 안내를 볼 수 없는 문제를 피했다. 기존 마이그레이션과 뷰는 수정하지 않았다.

`Clock`은 Java의 현재 시각 공급 타입이다. [OutingTimeConfiguration](../backend/src/main/java/kr/nadeulirang/backend/outing/OutingTimeConfiguration.java)의 `@Configuration`·`@Bean`은 `org.springframework.context.annotation`에서 가져오며 클래스·메서드에 붙는다. Spring이 시작할 때 `outingClock()`을 호출해 반환한 `Clock.systemUTC()`를 빈으로 등록하고 컨트롤러 생성자에 제공한다. `clock.instant()`로 얻은 한 시각을 `CollectionPolicy.SEOUL`로 바꿔 조회 전체에 같은 날짜를 적용한다. 테스트에서는 `Clock.fixed(...)`를 전달해 PC의 실제 날짜와 무관하게 서울 자정을 재현한다.

SQL `CASE`는 저장된 취소/종료 상태를 보존하고, 날짜가 있는 행사의 시작·종료를 현재 서울 날짜와 비교해 진행 중/예정/종료를 계산한다. 종료일과 같은 날은 진행 중이며 다음 날부터 목록에서 빠진다. 상설 시설은 시설 분류일 뿐 휴관·당일 운영을 확인했다는 뜻이 아니다. `operationVerified`와 근거별 확인 시각을 따로 읽어야 한다.

조건의 `?`는 값 바인딩이다. `strpos(lower(name), lower(?))`는 `%`·`_`를 와일드카드로 바꾸지 않고 이름에 해당 문자가 실제 있는지 찾는다. 정렬 SQL은 요청 문자열을 직접 붙이지 않고 검증한 네 가지 값에 대응하는 고정 SQL만 반환한다. 이름에는 PostgreSQL의 `COLLATE "C"`를 명시해 DB 생성 때의 기본 로케일이 달라도 같은 UTF-8 바이트 순으로 비교한다. 이는 언어별 사전식 정렬과 다르지만 배포 환경마다 목록 순서가 달라지는 일을 막는다. 같은 시작일/이름의 동률은 UUID로 정해 페이지 경계의 불필요한 순서 변화를 줄인다.

`@Transactional`은 `org.springframework.transaction.annotation.Transactional`에서 가져와 저장소 클래스에 붙인다. `readOnly = true`, `isolation = Isolation.REPEATABLE_READ`를 Spring의 트랜잭션 인터셉터가 외부 메서드 호출 시 적용한다. 총건수와 페이지 항목, 상세 공개 조건과 근거를 같은 DB 스냅샷에서 읽어 수집이 동시에 갱신해도 한 응답 안의 값이 서로 다른 순간의 값으로 섞이지 않게 한다. 트랜잭션이 필요해 DB 연결을 잠시 유지하는 비용이 있고, 다음 페이지 요청까지 영구 스냅샷을 유지하지는 않는다.

### 마지막 성공 근거·미확인·오류의 차이

상세 근거 SQL은 `record_operation.last_success_call = source_observation.call_id`로 각 오퍼레이션의 마지막 성공 원문을 찾는다. 수집 실패는 이 연결을 유지하고 실패 시각을 따로 남기므로 마지막 정상 문장을 읽을 수 있다. 정상 0건은 연결을 `NULL`로 만들고, 새 응답에서 빠진 필드는 새 원문에 없으므로 과거 값을 복원하지 않는다. 수집 시각과 원천 기준일/수정 시각, 마지막 응답 성공 시각을 서로 바꾸지 않는다.

`information`은 허용한 방문 정보 필드만 그룹으로 묶고 원천별 값을 보존한다. `observationId`는 반복 안내의 제목/본문을 같은 원문 행으로 연결한다. 주차·조건부 요금 문장이 섞인 `infotext`를 일반 입장료로 자동 분류하지 않는다. 빈 추가 요금을 무료로, 빈 할인을 할인 없음으로 바꾸지 않는다. 충돌 요금은 P11에서 계산한 `UNKNOWN`/`feeConflict`와 여러 원천의 문장을 함께 반환한다.

각 `Evidence.stale`은 해당 필드의 확인 시각을 쓰며 다른 오퍼레이션의 새 성공으로 오래된 운영 정보가 최신이 되지 않는다. HTTP(S) 링크는 원문의 명시적 주소만 `CollectionPolicy.safeLink`로 추출하며 HTML·예약 문장을 실행하거나 링크/조건을 만들어 내지 않는다. 프론트에서는 문장을 텍스트로 표시해야 한다. 현재 공식 공지의 구조화된 적용 기간/할인/예약 판단을 구현하지 않았으며 원천 문장과 `unconfirmed`를 함께 제공한다.

[OutingErrorHandler](../backend/src/main/java/kr/nadeulirang/backend/outing/OutingErrorHandler.java)의 `@RestControllerAdvice(assignableTypes = OutingController.class)`·`@ExceptionHandler`는 `org.springframework.web.bind.annotation`의 라이브러리 기능이다. Spring MVC가 이 컨트롤러의 요청 처리 중 발생한 지정 예외를 연결된 메서드로 전달한다. 없는/비공개 ID의 `OutingNotFoundException`은 404, 조건/타입 오류는 400, `DataAccessException`·`TransactionException`은 재시도 가능한 503이다. DB 오류를 빈 목록이나 404로 바꾸면 장애를 정상 데이터 없음으로 오인하므로 구분한다. SQL·접속 설정·오류 원문은 응답에 넣지 않는다.

확인은 [OutingApiTests](../backend/src/test/java/kr/nadeulirang/backend/outing/OutingApiTests.java)의 실제 PostgreSQL·HTTP 테스트다. 임의의 `p12_test_<UUID>` 스키마에서 검색 조합·문자 검색·안정된 페이지·서울 자정·공개 보호·출처/충돌·실패/0건·오류 응답을 확인하고 해당 스키마만 정리한다. 장애 테스트는 격리 스키마의 `outing` 이름을 잠시 바꿔 SQL 실패를 만들고 `finally`에서 복구한다. 앱 스키마의 자료는 수정하지 않는다.

선택적 연습: 종료일이 10월 5일인 행사를 서울 10월 5일 23:59:59와 10월 6일 00:00:00에 조회하면 목록·상세가 어떻게 달라지는지 `computesPeriodAtReadTime`의 입력과 비교한다. 결과가 없는 정상 검색과 DB 장애에서 HTTP 상태·본문이 어떻게 다른지도 찾아본다.

## 프론트 파일과 실행 흐름

관련 작업: P03·P04·P13·P24·P26·P27·P34·P35.

### 주소·화면·공통 UI의 역할

[홈 page.tsx](../frontend/src/app/page.tsx)의 비동기 `HomePage`는 API 결과를 기다린 뒤 [HomeReview](../frontend/src/features/outings/home.tsx)에 `data`·`options`·`query` props로 전달한다. `HomeReview`는 [OutingCard](../frontend/src/features/outings/outing-card.tsx)를 사용한다. [layout.tsx](../frontend/src/app/layout.tsx)의 `RootLayout`은 `ReviewProvider`와 `ReviewShell`로 페이지의 `children`을 감싼다.

| 위치 | 코드에서 맡는 역할 |
|---|---|
| src/app | Next.js의 URL별 진입점·공통 레이아웃·파비콘 응답 |
| src/components | 여러 화면이 함께 쓰는 UI·배치·스크롤 처리 |
| src/features | 나들이·정책·가이드 기능의 화면·데이터·동작 |
| src/config | 공통 브랜드 설정 |
| src/providers | 화면 간 공유 상태와 이동/복귀 처리 |
| src/styles | 화면과 공통 UI의 스타일 |
| public/images | /images/... 주소로 제공하는 이미지·출처 자료 |

`page.tsx`·`layout.tsx`는 Next.js 규칙이고 `components`·`features` 등의 이름은 이 프로젝트의 분류 방식이다. 코드를 각 주소 폴더 안에 모으는 대안도 있지만, 공유 UI와 기능 코드를 분리하면 수정 위치를 찾기 쉽다. 파일과 import가 늘어나는 비용은 있다. 전체 안내는 [프론트 README](../frontend/README.md#폴더-구성)를 참고한다.

### props·state와 서버/브라우저의 경계

React 컴포넌트는 UI를 표현하는 함수다. `props`는 전달받은 입력, `state`는 상호작용에 따라 바뀌는 값이다. 상세 서버 페이지는 공개 가능한 id의 API 응답을 기다린 뒤 `DetailReview`의 `data` prop으로 전달한다. 없는/비공개 id에서는 Next.js의 `notFound()`를 호출한다. JSX는 그 입력과 상태를 화면으로 표현한다. 사용자 입력·달력의 미적용 선택·메뉴 동작은 브라우저에서 처리한다.

`DetailReview`는 `safeUrl`로 표시 가능한 링크만 남긴 뒤 `links.some`으로 실제 예약 링크가 있는지 판단한다. 그 불리언 값에 따라 JSX의 삼항 연산자가 ‘공식 안내·예약’ 또는 ‘공식 안내’ 제목을 선택한다. 예약 링크가 없다는 이유로 예약 필요 여부를 추정하거나 누락 안내를 추가하지 않는다.

Next.js App Router의 페이지·레이아웃은 기본적으로 서버 컴포넌트다. `useState`·사용자 이벤트·`window` 등이 필요한 파일은 맨 위의 `"use client"`로 클라이언트 컴포넌트의 경계를 정한다. 클라이언트 컴포넌트도 첫 HTML의 서버 렌더링에 참여할 수 있으므로 모든 코드가 브라우저에서만 실행된다고 가정하지 않는다. [tsconfig.json](../frontend/tsconfig.json)의 `strict`는 타입 검사이며 실제 외부 응답의 정확성까지 보증하지 않는다.

[model.ts](../frontend/src/features/outings/model.ts)의 `Outing`은 카드 표시 타입이고 `outingSummary`가 API의 `Summary`를 변환한다. 검토 표본의 주소·출처를 실제 항목에 채우지 않는다. 실제 상태는 서버의 `apiPeriod`로 표시하며 `CANCELLED`·`ENDED`·`UNKNOWN`을 구분한다. 가이드의 [review-model.ts](../frontend/src/features/ui-design/review-model.ts)만 JSON 스냅샷을 읽고 `publicItems`·검색 예시를 계산한다. `seoulDate`·`ongoing` 등 날짜 도우미는 표시와 가이드에서 사용하며 실제 목록 구분은 DB 조회가 결정한다. 루트의 `force-dynamic`과 API 호출의 `no-store`는 빌드 날짜/응답을 현재 자료로 오인하지 않게 한다.

확인은 프론트의 날짜·검색 테스트 입력과 기대값을 읽는다. 선택적 연습으로 카드 이름 표시를 `outing-card.tsx`에서 바꾸면 홈·검색·가이드에 어떻게 반영될지 예상한다.

### 서버 조회·응답 타입과 실제 본문 HTML

[api-server.ts](../frontend/src/features/outings/api-server.ts)는 Next.js 서버에서만 사용하는 호출 코드다. `BACKEND_URL`은 Spring 주소이고 인증키·DB 설정을 브라우저로 전달하지 않는다. 페이지 → API 호출 → Spring 컨트롤러 → JDBC → 응답 → 화면 props 순으로 흐른다. 첫 HTML에도 실제 이름·이용 정보와 `href=/detail/...` 링크가 있으므로 브라우저가 나중에 목록을 채울 때까지 빈 본문을 제공하지 않는다.

`ApiResult<T>`는 `ok: true`의 `data`와 `ok: false`의 `status`·`message`를 나눈 유니온 타입이다. `T`는 응답 모양을 지정하는 타입 매개변수다. 외부 JSON을 TypeScript 타입으로 단정하면 잘못된 응답도 통과하므로 [api-contract.ts](../frontend/src/features/outings/api-contract.ts)의 타입 가드가 `unknown` 값의 배열·필드·null·숫자를 실제로 검사한다. 정상 0건은 빈 배열이고 접속 실패·8초 초과·비정상 JSON은 오류 결과다. 이전 검토 표본으로 대체하지 않는다. `React.cache`는 같은 렌더링 요청의 선택지/상세 중복 호출을 줄이며 날짜를 영구 캐시하지 않는다.

[api-query.ts](../frontend/src/features/outings/api-query.ts)는 URL의 `q`를 백엔드 `keyword`로, 기존 지역명을 현재 시도 코드로, 홈 `scope`를 기간 구분으로 바꾼다. 없는 지역을 전체 지역으로 넓히지 않는다. 페이지·정렬·다가오는 구간을 URL에 유지하고 검색 폼을 제출할 때 페이지는 1로 돌아간다. 기간 조건만 해제할 때 이름/지역/종류는 보존한다.

홈의 세 목록을 첫 20개 목록에서 잘라 만들면 해당 페이지 밖의 시설/행사가 빠질 수 있다. Java [OutingQuery](../backend/src/main/java/kr/nadeulirang/backend/outing/OutingQuery.java)의 `days` record 구성 요소는 0 또는 다가오는 구간 7·14·30만 허용한다. 기존 여섯 인수 생성자는 일곱 인수 생성자에 0을 전달한다. [OutingStore.home](../backend/src/main/java/kr/nadeulirang/backend/outing/OutingStore.java)은 한 `Instant`와 외부 호출에 적용된 읽기 트랜잭션 안에서 종료일/시작일/이름 순으로 세 구분을 조회한다. 내부 `list` 호출마다 별도 어노테이션 처리가 실행되는 것은 아니다. 시작일 상한 `today.plusDays(days)`를 건수와 페이지 계산 전에 SQL에 바인딩하고 DB 조회에서 각 구분을 3개로 제한해 반환하고 홈 날짜 동률은 ID로 정한다. 추가 DB 조회 비용은 있지만 이후 데이터가 늘어도 홈의 선정 기준을 유지한다.

간단 보기는 열릴 때 같은 서버의 [상세 중계 route.ts](../frontend/src/app/api/outings/[id]/route.ts)를 호출한다. Web API의 `Request`/`Response`를 쓰며 중계 404와 503을 구분한다. 닫힐 때 `AbortController`로 불필요한 요청을 취소한다. 상세의 [EvidenceList](../frontend/src/features/outings/evidence.tsx)는 원천 문장을 JSX 텍스트로 표시해 HTML을 실행하지 않는다. 서로 다른 주소/요금 문장은 유지하되 항목마다 출처·확인 시각을 반복하지 않는다. DetailReview의 refreshNeeded는 출처 또는 정보/링크의 stale·최근 조회 실패를 합쳐 필요한 경우에만 갱신 안내 한 줄을 표시한다. 공식 링크는 명시적 HTTP(S) 주소만 연결한다. DB/API의 근거는 보존하고 데이터셋·사진 출처와 이용 조건은 PolicyContent의 about 분기에서 공통 푸터 시트·직접 주소에 제공한다.

상세 제목 아래의 최근 자료 확인일은 API의 sourceCheckedAt(마지막 원천 성공의 최근 시각)을 Date로 읽고 유효한 경우에만 기존 seoulDate로 한국 날짜를 표시한다. 날짜 한 줄이 모든 필드의 동시 갱신을 뜻하지 않으므로 필드별 오래됨/실패 근거와 갱신 안내는 유지한다. detail-facts의 dt는 항목 이름, dd는 실제 값이며 CSS grid로 이름을 값 위에 배치한다. 값은 본문색·600, 이름과 detail-unknown은 보조색·400으로 표시한다. EvidenceList의 보조 이름도 span으로 구분해 긴 소개 본문까지 굵게 만들지 않는다. `orderedNotes`는 `observationId`별로 제목/본문을 묶어 주차 안내의 무료 문장이 다른 예약 안내와 섞이지 않게 한다.

[tsconfig.json](../frontend/tsconfig.json)의 `allowImportingTsExtensions`는 `noEmit` 검사 환경에서 `.ts` import를 허용한다. Node.js의 내장 TypeScript 처리로 가이드의 순수 모델과 실제 URL/응답 로직을 테스트하기 위해 사용하며 실행 코드에 별도 변환 의존성을 추가하지 않는다. 확인은 프론트 API 조건/상태/근거 묶기 테스트, 백엔드 서울 경계/페이지 테스트와 실제 HTML/브라우저 흐름으로 한다. 페이지의 예상 조회 오류는 오류·재시도 UI로 반환하고 HTTP 오류 상태 정책은 P14에서 점검한다.

### 상세 위치 정보의 구분

상세의 `locationGroups`는 `eventplace`/`opar`를 행사 장소로 먼저 묶고 주소 필드를 각각 구분한다. 원문 배열을 `filter`로 나누어 독립된 `dt`/`dd` 행에 표시하며 원문 값은 바꾸지 않는다. `EvidenceList`의 `showLabels={false}`는 이미 행 제목이 있는 위치 정보에서만 내부 이름의 반복을 생략한다. 값이 서로 다르면 둘 다 보존하고 실제로 같은 위치인지는 추정하지 않는다.

### 사진 출처의 접힌 안내

[policy-content.tsx](../frontend/src/features/policies/policy-content.tsx)의 사진 안내는 제공처와 이용 기준을 짧게 보여 주고, 저작자·원본·라이선스·변경 정보는 네이티브 `details`/`summary` 안에 둔다. `open` 속성을 생략해 처음에는 접히며 브라우저가 클릭·Enter/Space·펼침 상태를 처리하므로 별도 React state나 토글 스크립트가 필요 없다.

### URL·탭 저장과 복귀

[review-provider.tsx](../frontend/src/providers/review-provider.tsx)의 `useReviewState`는 `usePathname`·`useSearchParams`로 주소를 읽고 `navigate`·`back`·`openSheet`·`closeSheet`·`replaceSheet`로 이동을 처리한다. 조건은 `URLSearchParams`로 읽으며, 해시는 현재 페이지를 유지한 채 팝업의 열림을 나타낸다. `OutingPreview`는 상세 이동 시 간단 보기 이력을 교체하므로 뒤로 가기가 목록으로 돌아갈 수 있다.

`useSetting`은 `sessionStorage`와 사용자 정의 이벤트를 `useSyncExternalStore`로 구독한다. 서버에서는 fallback으로 초기 화면을 만들고 브라우저에서 저장한 기간·홈 조건을 읽는다. `sessionStorage`는 탭에 속하므로 계정 간 동기화 저장소가 아니다.

`saveScroll`은 주소별 위치를 저장한다. `nextNavigation` ref는 코드로 요청한 이동과 뒤로/앞으로 가기를 구분하며, 복귀 시 [service-scroll.ts](../frontend/src/components/layout/service-scroll.ts)의 실제 스크롤 영역에 위치를 적용한다. 화면 state만 쓰는 대안은 단순하지만 직접 접속·새로고침·복귀에서 조건을 유지하기 어렵다. URL과 저장소를 함께 쓰면 구독·서버 초기값·복귀 검증 비용이 생긴다.

확인은 조건 변경 → 상세 → 뒤로 가기와 새로고침이다. 선택적 연습으로 URL의 조건, 탭의 설정, 컴포넌트 안의 미적용 값을 각각 찾아본다.

### 팝업·필터의 적용과 취소

[dialog.tsx](../frontend/src/components/ui/dialog.tsx)의 `ReviewDialog`는 `dialogRef`로 실제 dialog를 참조하고 `useEffect`에서 `showModal`을 호출한다. `getBoundingClientRect`로 서비스 경계를 읽어 창을 배치하고 CSS backdrop의 `clip-path`로 배경을 제한한다. 열기 전 활성 요소와 스크롤 상태를 보존하며 닫을 때 overflow 설정과 포커스를 복원한다. body와 오른쪽 서비스 영역의 스크롤은 별도로 잠근다.

[HomeFilter](../frontend/src/features/outings/home-filter.tsx)는 URL의 적용 조건을 기본값으로 보여주고 열릴 때 `form.reset`으로 미적용 값을 정리한다. [Calendar](../frontend/src/features/ui-design/calendar.tsx)는 `pending` 선택과 표시 월·포커스를 분리한다. 취소는 적용값을 바꾸지 않고 완료가 선택값을 전달한다. 날짜 입력 예시는 가이드 코드이며 제품의 활성 검색 필터와 구분한다.

[review.css](../frontend/src/styles/review.css)의 `data-sheet`·`translate`·`@starting-style`은 아래에서 올라오는 전환을 만든다. `display`·`overlay`의 `allow-discrete`는 닫을 때도 전환을 유지하는 데 사용한다. 즉시 컴포넌트를 제거하면 퇴장 전환이 사라지므로 현재 필터·정책·간단 보기 시트는 마운트를 유지한다. `prefers-reduced-motion`은 움직임을 제거한다. 네이티브 dialog를 사용해도 포커스 복귀·스크롤·키보드와 브라우저 지원을 직접 확인해야 한다.

선택적 연습으로 날짜를 고른 뒤 취소/완료했을 때 `pending`과 입력값이 어떻게 달라질지 코드와 비교한다.

### 레이아웃·입력·드래그·상태 표시

[detail.tsx](../frontend/src/features/outings/detail.tsx)의 `detail-status-meta`는 제목 아래 상태칩과 최근 자료 확인일을 별도 flex 행에 둔다. `justify-content: space-between`은 칩을 왼쪽, 확인일을 오른쪽에 배치하고 `flex-wrap`은 함께 들어가지 않으면 확인일을 다음 줄로 보낸다. 제목의 `max-width: 100%`·`overflow-wrap: anywhere`는 긴 이름을 생략하지 않고 영역 안에서 줄바꿈한다. 상태를 계산하는 `Badge` 로직은 배치와 독립적이다.

[site-shell.tsx](../frontend/src/components/layout/site-shell.tsx)와 `review.css`는 모바일 서비스와 PC 안내/서비스를 구성한다. PC의 오른쪽 스크롤은 `service-scroll.ts`로 읽고 복원한다. 검색창은 `search-keyword`의 `focus-within`에 경계와 포커스 링을 적용한다. 320px에서는 두 grid 열을 모두 차지해 입력 폭을 확보한다.

`HomeReview`의 `chipDrag`는 마우스 이동이 6px 이상일 때 드래그로 처리하고 `scrollLeft`를 바꾼다. 드래그 뒤 클릭을 억제하며 터치는 네이티브 스크롤을 유지한다. `overflow-x`만 쓰는 대안은 간단하지만 마우스로 끄는 동작을 따로 제공하지 않는다. 방향키·정상 클릭·`pointercancel`을 함께 확인한다.

[feedback.tsx](../frontend/src/components/ui/feedback.tsx)의 `LoadingState`·`EmptyState`·`ErrorState`는 로딩·정상 0건·요청 실패를 구분한다. 로딩은 `role=status`로 알리고 장식 아이콘은 읽기에서 제외한다. 심볼은 CSS mask와 transform으로 움직이며 reduced-motion에서는 정적이다. 가이드의 재시도는 표시 예시이므로 실제 요청 오류의 검증을 대신하지 않는다.

### 브랜드·이미지·정책·개발 표시

#### 실제 대표 사진의 저장과 표시

[V4](../backend/src/main/resources/db/migration/V4__file_asset.sql)의 `file_asset`은 파일 내용 대신 `REMOTE` 저장 방식·원본/미리보기 URL·제공처·이용 유형·확인 시각을 관리한다. `record_id`와 `observation_id` 외래키로 출처 항목과 실제 JSON 원문을 찾을 수 있다. `(record_id, original_url)`의 `UNIQUE`는 같은 사진의 중복 생성을 막고, `WHERE active`가 붙은 유일 인덱스는 한 원천에 활성 대표 사진 하나만 허용한다. 이전 사진은 비활성 이력으로 보존한다.

[CollectionStore](../backend/src/main/java/kr/nadeulirang/backend/collection/CollectionStore.java)의 `ingest`는 성공한 공통 응답을 저장한 트랜잭션 안에서 이전 사진을 비활성화하고 Type1의 허용 URL만 삽입/갱신한다. `ON CONFLICT ... DO UPDATE`는 같은 URL이면 원문 참조와 확인 시각을 갱신한다. 실패 처리에는 사진 삭제가 없으며, 정상 응답에서 사진이 없어지거나 유형이 바뀌면 활성 사진이 사라진다. [PhotoPolicy](../backend/src/main/java/kr/nadeulirang/backend/collection/PhotoPolicy.java)의 `url`은 Java `String.matches`로 호스트·경로·확장자를 확인하고 HTTP 주소는 같은 호스트의 HTTPS로 바꾼다. 임의 URL을 서버에서 다운로드하는 기능은 만들지 않았다.

[OutingStore](../backend/src/main/java/kr/nadeulirang/backend/outing/OutingStore.java)의 `LEFT JOIN LATERAL`은 각 공개 후보의 최신 원문과 연결된 활성 사진 하나를 같은 목록 조회에 붙인다. `LEFT JOIN`이므로 사진이 없어도 나들이 행이 사라지지 않는다. [OutingResponse.Photo](../backend/src/main/java/kr/nadeulirang/backend/outing/OutingResponse.java)는 Java `record`로 API 필드와 타입을 선언하며 생성자에 SQL에서 읽은 UUID·문자열·Instant를 전달한다. 사진이 없으면 `Summary.photo`는 `null`이다. 제공처는 API 공급 기관이며 확인되지 않은 촬영자 이름을 만들지 않는다.

프론트 [api-contract.ts](../frontend/src/features/outings/api-contract.ts)의 `isPhoto`가 이용 유형·URL·제공처를 검사하고 `outingSummary`가 사진을 화면 모델로 전달한다. [OutingArtwork](../frontend/src/features/outings/outing-artwork.tsx)의 `useState`는 로딩 실패한 URL을 기억한다. Next.js `Image`의 `onError`가 이 상태를 갱신하면 해당 사진 대신 종류 아이콘을 렌더링한다. `unoptimized`는 브라우저가 원본 URL을 직접 요청하도록 하며 `object-fit: contain`은 사진 전체를 잘라내지 않고 배치한다. 원천 호스트 장애/변경의 영향을 받는 대신 로컬 파일 저장·동기화 비용이 없다. 가이드의 로컬 표본은 실제 API 상태가 없는 자료에만 적용한다.

확인은 사진 중복/주소 변경·사진 제거/유형 변경·수집 실패 보존·위험 URL·비공개 보호 테스트와 실제 브라우저의 `naturalWidth`·아이콘 대체로 수행한다. DB 메타데이터 확보와 이미지 서버의 현재 로딩 성공은 서로 다른 결과다.

[brand.ts](../frontend/src/config/brand.ts)의 한 팔레트를 `ReviewShell`의 CSS 변수와 [icon.ts](../frontend/src/app/icon.ts)가 공유한다. public의 이미지는 코드처럼 실행되지 않고 URL 요청으로 제공된다. `OutingArtwork`는 대표 이미지 또는 종류 아이콘을 표시하며 이미지가 없어도 종류와 텍스트를 읽을 수 있다. 사진의 작성자·원본 링크·라이선스·잘라 표시한 안내는 공통 서비스·데이터 출처에서 제공한다.

정책 본문은 직접 접속 페이지와 바텀시트가 공유한다. Next.js 개발 표시 위치는 [next.config.ts](../frontend/next.config.ts)에서 정하고, [ReviewDevTools](../frontend/src/components/layout/review-dev-tools.tsx)는 가이드/iframe에서만 Next.js 포털의 Shadow DOM에 스타일을 넣는다. 일반 화면으로 이동하면 스타일·관찰자를 정리한다. 이 DOM 식별자에 의존하므로 Next.js 갱신 때 숨김/복원을 다시 확인할 비용이 있다.

## 테스트와 개발 도구

관련 작업: P10·P16·P18.

### Maven·커밋 훅·CI의 검사 흐름

읽을 파일은 pom.xml, 검사 스크립트와 CI 설정이다. 실행 명령은 [README](../README.md#커밋-검사)를 따른다.

Maven의 `test`는 앞선 컴파일 단계와 테스트까지 수행한다. `verify`는 앞선 패키징과 검증 단계까지 진행하며 현재 Spring Boot 플러그인 구성은 실행 JAR을 만든다. `verify`라고 해서 프로젝트에 작성하지 않은 품질 검사까지 자동으로 생기는 것은 아니다. [Maven 공식 빌드 흐름](https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html)

[check-commit.mjs](../scripts/check-commit.mjs)는 스테이징한 경로로 프론트·백엔드·도구 검사 필요 여부를 정한다. [check-backend.mjs](../scripts/check-backend.mjs)는 Maven 테스트를 실행한다. [.github/workflows/ci.yml](../.github/workflows/ci.yml)은 새 PostgreSQL 서비스와 JDK로 백엔드 테스트·빌드를 수행해 로컬 환경에만 의존하지 않도록 한다.

검사를 나누면 커밋 대기 시간을 줄일 수 있지만 경로 분기가 잘못되면 필요한 검사를 놓칠 수 있다. 모든 검사를 매 커밋에 실행하는 대안은 단순하지만 비용이 늘어난다. 부분 스테이징을 차단하는 이유는 검사한 코드와 커밋될 코드가 달라지는 상황을 줄이기 위해서다. [훅 분기 테스트](../tests/tooling/commit-check.test.mjs)는 실패 차단·수정 후 통과·부분 스테이징·문서 변경을 임시 저장소에서 검사한다.

선택적 연습으로 README만 수정할 때와 백엔드 SQL을 수정할 때 각각 실행돼야 할 검사를 예상하고 코드의 분기와 비교한다. 훅·CI 성공과 사람의 리뷰가 확인하는 내용의 차이도 찾아본다.

`npm test`의 작업 디렉터리에 따라 루트의 공통 도구 테스트와 frontend의 기능 테스트가 달라진다. 실제 명령은 README의 각 검증 절을 따른다.
