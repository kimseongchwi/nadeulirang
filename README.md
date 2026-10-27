# 나들이랑 (nadeulirang)

전국 축제·행사·전시·박물관·문화관광지를 발견하고 일정·요금·방문 정보를 공식 출처로 확인하는 개인 웹 서비스입니다. Java·Spring·React 학습과 검색 유입·광고 수익을 함께 목표로 합니다. 첫 공개 범위와 후속 기능은 [PRD](docs/PRD.md), 작업 상태는 [PLAN](PLAN.md)을 따릅니다.

## 기술 구성

Next.js 16.4.3·React 19.2.8·TypeScript strict / Spring Boot 4.1.1·Java 21·Maven Wrapper 3.9.16 / PostgreSQL 18.6·Spring Data JPA·Hibernate·Flyway를 사용합니다.

## 빠른 실행

Node.js 24·JDK 21·PostgreSQL을 준비한 환경에서 저장소 루트의 PowerShell 터미널 두 개로 실행합니다. npm.ps1이 차단되면 npm.cmd를 사용합니다.

~~~powershell
# 백엔드 터미널
. ./scripts/use-local-env.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/local-db.ps1 start
$env:MAVEN_USER_HOME = Join-Path $PWD '.local/maven'
./backend/mvnw.cmd -B -ntp -f backend/pom.xml "-Dmaven.repo.local=$PWD/.local/maven/repository" spring-boot:run

# 프론트 터미널: 최초 복제·의존성 변경 때만 npm ci
npm ci --prefix frontend
npm --prefix frontend run dev
~~~

[홈](http://localhost:3000/)·[검색](http://localhost:3000/search)은 Next.js 서버가 기본 http://127.0.0.1:8080의 Spring API를 조회합니다. 백엔드 포트를 바꾸면 [frontend/.env.example](frontend/.env.example)에 따라 frontend/.env.local의 BACKEND_URL을 설정합니다. 서버 전용 변수이며 원천 키·DB 정보를 프론트나 NEXT_PUBLIC_ 변수에 넣지 않습니다. 서버 종료는 각 터미널의 Ctrl+C입니다.

[Spring health](http://localhost:8080/actuator/health)는 DB 연결 정상 시 200·UP, 장애 시 503을 반환하며 환경 상세는 공개하지 않습니다. Next.js의 /api/health는 제공하지 않습니다. API 사용법·응답/오류 계약은 [백엔드 README](backend/README.md#목록상세-조회-api)를 참고합니다.

P30의 [소셜 로그인](http://localhost:3000/login)는 동일 출처 `/api/auth/*`로 Spring 인증을 중계합니다. 작업 폴더 `.env`의 인증 항목은 `use-local-env.ps1`이 현재 실행 프로세스에만 적용하고 홈 공통 설정으로 복사하지 않습니다. 프론트 `AUTH_PUBLIC_ORIGIN`은 백엔드와 같아야 합니다. 외부 제공자·실제 가입 정책이 없는 항목은 활성화되지 않으며 준비 절차·API·검증 구분은 [회원 인증 안내](backend/README.md#회원-인증-api--p30)를 따릅니다. health는 DB 실행 확인이며 제공자 인증 확인을 대신하지 않습니다.

## UI 디자인 가이드 확인

같은 개발 서버의 [/ui-design](http://localhost:3000/ui-design)에서 공유 UI와 320/390/430px 미리보기를 확인합니다. 가이드 표본은 서비스 오류의 대체 데이터로 사용하지 않습니다. iframe은 실제 서비스 페이지이며 홈·검색·상세 조회에는 백엔드가 필요합니다. 구조·가이드 사용법은 [프론트 README](frontend/README.md), 현재 적용/미정 기준은 [DESIGN](DESIGN.md)을 따릅니다. 개발·검토 환경과 가이드의 noindex를 유지하며 공개용 주소/색인 설정은 [프론트 SEO 안내](frontend/README.md#공개-seo-설정-p14)를 따릅니다.

## 백엔드 개발 환경

처음 준비하는 PC는 [JDK·PostgreSQL·앱 계정 준비](backend/README.md#최초-환경-준비)를 따릅니다. 기존 `.local/postgres-data`와 설정은 초기화하거나 삭제하지 않습니다. DB는 `scripts/local-db.ps1 status|start|stop`으로 관리합니다.

## 무료 검토 환경 연결 (P15)

광고 없는 개인 검토용 Vercel 연결·빌드·서버 환경변수와 접속 주소는 [프론트 검토 배포](frontend/README.md#vercel-개인-검토-배포-p15)를 따릅니다. Vercel에서 로컬 PC의 Spring·DB에는 접속할 수 없으며, 프론트 배포와 전체 서비스 동작을 구분합니다. 외부 Spring·PostgreSQL 준비 순서와 무료 후보 제약은 [백엔드 검토 환경](backend/README.md#외부-springpostgresql-검토-환경-p15)을 참고합니다. 검토 주소는 noindex와 Vercel 접근 보호를 유지합니다.

## 작업 폴더 사이의 로컬 설정 유지 (P22)

같은 PC의 공통 원천 키·DB 설정을 보관할 때만 [로컬 설정 유지](backend/README.md#작업-폴더-사이의-로컬-설정-유지-p22)를 사용합니다. 소셜 인증 설정은 작업 폴더에만 두며 배포 환경으로 자동 복사하지 않습니다.

## 필수 검증

### 코드 포맷

프론트는 Prettier(100열·JSX 속성별 줄바꿈), Java는 Spotless의 Google Java Format AOSP(4칸)를 사용합니다. 포맷 변경은 로직 변경과 별도 커밋으로 묶습니다. 대상은 frontend/src의 TS·TSX·CSS와 backend/src의 Java뿐이며 문서·Flyway·원문/표본·공식 리소스는 제외합니다.

~~~powershell
npm --prefix frontend run format        # 적용, 검사만 할 때 format:check
. ./scripts/use-local-env.ps1
$env:MAVEN_USER_HOME = Join-Path $PWD '.local/maven'
./backend/mvnw.cmd -B -ntp -f backend/pom.xml "-Dmaven.repo.local=$PWD/.local/maven/repository" spotless:apply
# Java 검사만 할 때 spotless:check
~~~

개발 중 필요한 피드백은 루트에서 영향받는 영역의 검사로 확인합니다. 아래 명령을 매번 모두 실행하지 않습니다. 완료 후 바로 커밋할 때는 [커밋 검사](#커밋-검사)의 `commit:checked`로 검사·커밋을 묶어 같은 검사를 수동 실행한 뒤 훅에서 반복하지 않습니다. DB는 백엔드 DB 검사 때만 실행 상태를 확인하고 필요하면 시작합니다.

~~~powershell
npm --prefix frontend run check:quick  # lint·Next 경로 생성·strict 타입
npm --prefix frontend test            # 프론트 로직·응답 계약 회귀
npm --prefix frontend run build
npm test                             # 개발 도구 핵심 검증
npm run check:docs                    # 직접 작성한 문서·로컬 기록의 파일/앵커
npm run check:backend                 # 실제 PostgreSQL 기반 Maven test
npm run check:backend -- --verify     # 위 test를 포함한 실행 JAR 생성까지 한 번에 확인
~~~

### 백엔드 실행·검증

기능 완료·PR 전에는 테스트와 실행 JAR 생성을 함께 확인합니다. 커밋과 함께 확인할 때는 `commit:checked`를 사용하고, 커밋 없이 검증할 때는 아래 `verify`를 한 번 실행합니다. `verify`가 포맷·컴파일·테스트·패키징을 포함하므로 같은 내용에 `test`나 `spotless:check`를 먼저 반복하지 않습니다.

~~~powershell
. ./scripts/use-local-env.ps1
$env:MAVEN_USER_HOME = Join-Path $PWD '.local/maven'
./backend/mvnw.cmd -B -ntp -f backend/pom.xml "-Dmaven.repo.local=$PWD/.local/maven/repository" verify
java -jar backend/target/backend-0.0.1-SNAPSHOT.jar
~~~

check:backend는 자식 세션에 로컬 환경을 적용하며 DB 자체는 시작하지 않습니다. 테스트는 실행별 UUID 스키마에서 마이그레이션·API·날짜/요금·중복/실패·JPA/SQL 트랜잭션을 검사하고 해당 스키마만 제거합니다. 결과는 backend/target/surefire-reports/입니다. Linux·CI는 JDK 21·DB 변수 세 개를 준비하고 backend에서 ./mvnw -B -ntp verify를 실행합니다. CI는 전용 PostgreSQL 서비스와 임시 인증값을 사용합니다.

## 데이터 수집 (P11·P38)

필요할 때 [수동 수집·보완·사진 재처리](backend/README.md#수집-실행)를 실행합니다. 저장 원문부터 대조하며 대상·원천 호출 예산은 [DATA_SOURCES](docs/DATA_SOURCES.md#p11-수집-기준)를 따릅니다.

## 원천 API 표본 검증

실제 원천 호출이 필요한 경우에만 [표본 검증 명령](backend/README.md#원천-api-표본-검증)을 사용합니다. 앱의 회귀 검사는 원천 실호출과 구분합니다.

## 커밋 검사

최초 복제 뒤 npm run setup:hooks로 로컬 훅을 연결합니다. 훅은 공백·민감한 파일명·한국어 커밋 형식을 확인하고 변경 코드에 필요한 검사만 실행합니다.

완료한 변경은 목적별 경로를 스테이징하고 diff 자체 리뷰·필요한 화면/실행 확인을 마친 뒤 다음 명령으로 검사와 로컬 커밋을 함께 수행합니다. 메시지 파일은 한국어 제목·본문을 담은 로컬 파일입니다.

~~~powershell
npm run commit:checked -- --file .local/commit-message.txt
~~~

이 명령은 해당 Git 프로세스에만 `.githooks`와 전체 검사 모드를 지정합니다. 영구 Git 설정은 바꾸지 않으며 필수 훅을 그대로 실행합니다. 전체 모드는 문서 링크 검사와 변경 영역의 도구 테스트·프론트 `check`(빠른 검사·회귀·빌드)·백엔드 `verify`를 각각 한 번 실행합니다. 실패하면 커밋하지 않으며 재시도 때 다시 검사합니다. 이전 성공을 캐시하거나 DB 검사를 생략하지 않습니다. 검사별 소요 시간도 출력합니다.

일반 `git commit`은 아래 빠른 검사 범위를 유지합니다. `npm run check:commit`은 커밋 없는 진단용이므로 바로 커밋할 때 별도로 먼저 실행하지 않습니다. CI는 별도 환경의 필수 검증이므로 로컬 통과와 관계없이 유지합니다.

| 변경 | 검사 |
|---|---|
| 문서 | 훅의 코드 검사 생략. check:docs와 상태 자체 확인, CI의 문서 검사 |
| 프론트 코드/설정 | check:quick(포맷·lint·strict) |
| 백엔드 코드/설정·DB 환경/수집 실행 도구 | check:backend(Java 포맷·DB 테스트) |
| 일반 도구 | 루트 npm test |
| 공통 설정·검사 선택 도구·훅/CI | 프론트·백엔드·도구 검사 모두 |

검사 대상 코드에 미스테이징 변경이 있으면 중단합니다. 삭제·이동은 이전/현재 경로를 함께 검사합니다. 전체 빌드는 기능 완료·PR 전 또는 [CI](.github/workflows/ci.yml)에서 확인합니다. 훅과 CI는 check-scopes.mjs의 같은 규칙을 사용하며 CI는 영향받는 영역의 전체 검사를 실행합니다. 문서만 변경해도 기존 두 검사 이름은 결과를 반환하고, 경로 판정 실패를 성공으로 처리하지 않습니다. 최초 브랜치 push·수동 CI는 전체 검사입니다. 실제 GitHub 실행과 저장소 필수 조건의 최종 대조는 원격 반영 때 확인합니다. 권한·목적별 커밋·리뷰 규칙은 [AGENTS](AGENTS.md)를 따릅니다.

## 문서 안내

| 읽을 때 | 문서 |
|---|---|
| 실행·설정·검증 | 이 README, [프론트](frontend/README.md), [백엔드](backend/README.md) |
| 코드를 배우고 수정할 때 | [LEARNING](docs/LEARNING.md) |
| 제품·화면·원천 기준을 확인할 때 | [PRD](docs/PRD.md), [DESIGN](DESIGN.md), [DATA_SOURCES](docs/DATA_SOURCES.md) |
| 다음 작업·상태를 확인할 때 | [PLAN](PLAN.md) |
| 개발 규칙·문서 갱신 기준 | [AGENTS](AGENTS.md), [프론트 추가 규칙](frontend/AGENTS.md) |

실제 작업·오류는 Git 제외 로컬 docs/WORKLOG.md·docs/ERRORS.md에 기록합니다.
