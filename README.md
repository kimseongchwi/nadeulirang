# 나들이랑 (nadeulirang)

전국 축제·행사·전시·박물관·문화관광지를 발견하고, 관심 있는 곳의 일정·요금·방문 정보를 공식 출처로 확인하는 개인 웹 서비스입니다. 검색 유입과 광고 수익을 목표로 합니다. 현재 제공 범위와 후속 기능은 [PRD](docs/PRD.md)에서 관리합니다.

서비스를 만들고 운영하면서 Java·Spring·React를 학습하는 것도 개발 목적입니다. 현재 코드·설정·파일 구조의 문법·핵심 식별자·동작 흐름과 구현 선택 이유를 [학습 문서](docs/LEARNING.md)에 연결해 설명하고, 작은 변경·결과 예측으로 이해를 확인합니다. 학습 협업 방식은 [AGENTS](AGENTS.md#개발과-학습)를 따릅니다.

## 기술 구성

- 프론트엔드: React 기반 Next.js + TypeScript
- 백엔드: Spring Boot 4.1.1 + Java 21 + Maven Wrapper 3.9.16
- 데이터베이스: PostgreSQL

## 문서 안내

| 문서 | 역할 |
|---|---|
| [PLAN.md](PLAN.md) | 항목 번호·완료 기준이 있는 작업 체크리스트 |
| `docs/WORKLOG.md` (로컬 전용) | PLAN 항목에 연결한 날짜별 결과·검증·리뷰. Git 추적 제외 |
| [docs/PRD.md](docs/PRD.md) | 제품 요구사항: 무엇을 만들고 어떤 동작을 제공할지 |
| [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md) | 원천별 표본·출처·이용 조건과 현재 수집/후속 검토 기준 |
| [docs/LEARNING.md](docs/LEARNING.md) | 현재 코드·파일 역할·문법·호출/데이터 흐름·구현 이유·확인 방법 |
| [DESIGN.md](DESIGN.md) | 현재 선택·미확정 검토안과 필요한 과거 결정 근거 |
| [AGENTS.md](AGENTS.md) | 계획에 따른 작업·검증·기록 규칙 |
| [frontend/AGENTS.md](frontend/AGENTS.md) | Next.js 작업에 필요한 추가 안내 |
| [frontend/README.md](frontend/README.md) | 프론트 폴더 안내와 공통 문서 연결 |
| [backend/README.md](backend/README.md) | 백엔드 폴더·마이그레이션 안내와 공통 문서 연결 |

## 작업 흐름

[PLAN](PLAN.md)의 항목을 골라 구현·검증·리뷰하고, 실제 결과는 로컬 docs/WORKLOG.md에 기록합니다. 완료 기준을 충족한 항목만 ✅로 표시합니다.

작업·학습·문서 관리·브랜치·커밋·원격 반영 규칙은 [AGENTS](AGENTS.md)를 따릅니다. 완료 작업은 검증과 훅 통과 뒤 로컬 커밋하며 디자인 변경은 명시적인 커밋 요청이 필요합니다. 푸시·PR·main 반영·배포는 허용된 요청 범위에서 수행합니다.

WORKLOG는 Git에서 제외하며 새 환경에서는 첫 작업 결과를 기록할 때 생성합니다. 형식은 [로컬 작업 기록 규칙](AGENTS.md#로컬-작업-기록)을 따릅니다.

## UI 디자인 가이드 확인

아래 프론트 개발 서버를 실행한 뒤 [UI 디자인 가이드](http://localhost:3000/ui-design)에 접속합니다. [홈](http://localhost:3000/)·[검색](http://localhost:3000/search)·상세도 같은 서버에서 확인합니다. 별도 디자인 폴더나 검토 서버를 실행할 필요가 없습니다. 개발 서버가 다른 포트를 사용하면 그 주소 뒤에 `/ui-design`을 붙입니다. 개발 환경 PC 화면의 왼쪽 소개 아래에서도 UI 가이드 보기로 이동할 수 있습니다. 이 링크는 프로덕션 빌드에서 표시하지 않습니다.

가이드는 [ui-design/page.tsx](frontend/src/app/ui-design/page.tsx), 홈·검색·상세·정책은 frontend/src/app의 각 페이지에서 제공합니다. 공통 UI와 기능별 화면·데이터의 위치는 [프론트 폴더 구성](frontend/README.md#폴더-구성)을 참고합니다. 이미지는 [public/images](frontend/public/images/)에서 관리하며 가이드와 서비스 화면은 같은 컴포넌트를 사용합니다. 홈·검색·상세는 Spring API의 실제 수집 DB를 조회하고 검토 스냅샷은 가이드의 카드 예시에서만 사용합니다. 채택한 홈 구성·웹 로고를 적용했으며 공개 운영은 별도입니다. 현재 noindex 설정을 유지하고 공개 대상별 SEO 수정은 P14에서 진행합니다. 상태는 [PLAN](PLAN.md)·[DESIGN](DESIGN.md)을 참고합니다.

## 프론트 실행

Node.js 24 LTS와 npm을 사용합니다. frontend 기본 프로젝트는 이미 생성되어 있습니다. 저장소 루트에서 다음 명령을 실행합니다.

```powershell
cd frontend
npm ci
npm run dev
```

npm ci는 처음 복제하거나 의존성이 변경되었을 때 실행합니다. 이후에는 npm run dev로 시작합니다. 접속 주소는 [http://localhost:3000](http://localhost:3000)이며, 포트가 다르면 터미널에 출력된 주소를 사용합니다.

루트 폴더에서 바로 시작하려면 `npm --prefix frontend run dev`를 사용합니다. 개발 서버 종료는 Ctrl+C입니다.

홈·검색·상세의 실제 조회에는 아래의 [백엔드 실행](#백엔드-실행검증)과 DB도 필요합니다. Next.js 서버가 기본 `http://127.0.0.1:8080`의 Spring API를 호출합니다. 백엔드 포트를 바꾸면 [frontend/.env.example](frontend/.env.example)을 참고해 `frontend/.env.local`에 `BACKEND_URL`을 지정한 뒤 프론트를 다시 실행합니다. 이 변수는 서버에서만 읽으며 `NEXT_PUBLIC_`로 만들지 않습니다. 원천 인증키·DB 접속 정보는 프론트에 넣지 않습니다. 배포 서버의 주소·설정은 P15에서 별도로 준비하며 사용자 홈의 로컬 설정을 자동 복사하지 않습니다.

`/search`의 `q`·`region`(시도 코드)·`kind`·`scope`·`days`·`sort`·`page`로 조건과 페이지를 복원합니다. 기존 시도 이름 주소도 현재 선택지의 코드로 해석합니다. 정상 0건과 잘못된 조건·조회 실패는 다른 안내이며, 장애 시 검토 표본으로 대체하지 않습니다. `/api/outings/:id`는 간단 보기의 같은 출처 상세 중계 경로입니다. 없는/비공개 상세는 404, 중계 장애는 503입니다. 페이지의 예상 조회 오류는 현재 HTTP 200에 오류·재시도와 noindex를 표시하며 검색엔진용 오류 상태 코드 정책은 P14에서 점검합니다.

## 프론트 검증

frontend 폴더에서 실행합니다.

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

`npm test`는 서울 날짜 경계·행사 노출 기간·검색 조건을 검사합니다. `npm run check`는 위 검증을 순서대로 실행합니다.

## 백엔드 개발 환경

Windows용 프로젝트 전용 환경을 사용합니다. JDK·PostgreSQL 실행 파일, DB 데이터·로그·접속 파일은 Git에서 제외한 `.local/`에 보관합니다. 시스템 PATH·사용자 환경 변수·Windows 서비스는 등록하지 않으며 새 터미널에서 아래 스크립트를 다시 적용합니다.

### JDK 21

[Eclipse Temurin 공식 배포](https://adoptium.net/temurin/releases/?version=21&os=windows&arch=x64)에서 Windows x64 **JDK 21 ZIP**을 받고 배포 페이지의 SHA256과 `Get-FileHash -Algorithm SHA256` 결과를 대조합니다. JRE만 받으면 `javac`가 없습니다. ZIP을 `.local/java/`에 풀어 `.local/java/jdk-21.<버전>/bin/java.exe` 구조로 둡니다. 이 폴더에는 사용할 JDK 21 배포본 하나만 둡니다.

저장소 루트의 PowerShell에서 실행합니다. 실행 정책이 스크립트를 차단할 때만 `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`를 먼저 실행합니다. 적용 범위는 현재 세션입니다.

```powershell
. ./scripts/use-local-env.ps1
java -version
javac -version
```

스크립트는 현재 세션의 `JAVA_HOME`·PATH를 설정하고 아래 [공통 로컬 설정](#작업-폴더-사이의-로컬-설정-유지-p22)과 폴더별 `.env`에서 `DB_URL`·`DB_USERNAME`·`DB_PASSWORD`만 환경 변수로 전달합니다. API 키를 환경 변수로 전달하거나 값에 포함된 코드를 실행하지 않습니다. 반복 적용해도 PATH 항목을 중복 추가하지 않습니다.

### PostgreSQL

[PostgreSQL 공식 Windows 안내](https://www.postgresql.org/download/windows/)에서 연결하는 [EDB 바이너리 배포](https://www.enterprisedb.com/download-postgresql-binaries)의 Windows x64 PostgreSQL 18 ZIP을 사용합니다. ZIP의 `pgsql/bin`·`pgsql/lib`·`pgsql/share`를 `.local/postgresql/` 아래에 풀어 `.local/postgresql/pgsql/bin/psql.exe` 구조로 둡니다. pgAdmin·Stack Builder는 이 환경에서 사용하지 않습니다.

**처음 준비할 때만** 저장소 루트에서 초기화합니다. `.local/postgres-data`가 이미 있으면 다시 초기화하거나 삭제하지 않습니다. 5432를 다른 DB가 사용하는 경우 기존 DB를 종료하지 말고 포트와 아래 접속 설정을 함께 조정합니다. 실제 데이터가 생긴 후의 버전 변경은 별도 마이그레이션 작업으로 다룹니다.

```powershell
. ./scripts/use-local-env.ps1
initdb -D .local/postgres-data -U postgres --pwprompt --encoding=UTF8 --locale=C --auth=scram-sha-256 --set=listen_addresses=127.0.0.1 --set=port=5432 --set=timezone=Asia/Seoul --set=log_timezone=Asia/Seoul
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/local-db.ps1 start
psql -X -h 127.0.0.1 -p 5432 -U postgres -d postgres -W
```

초기화 시 관리자 비밀번호를 입력하고 `psql`에서도 같은 비밀번호를 입력합니다. 관리자 `psql` 안에서 전용 계정·DB를 생성합니다. `\password`의 프롬프트에 앱 계정용 비밀번호를 입력하며 SQL·명령 인수에 비밀번호를 직접 쓰지 않습니다.

```sql
CREATE ROLE nadeulirang LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
\password nadeulirang
CREATE DATABASE nadeulirang OWNER nadeulirang ENCODING 'UTF8';
\q
```

기존 API 키가 있는 루트 `.env`를 보존하고 다음 세 변수를 따옴표 없이 추가합니다. `.env.example`은 빈 값의 양식입니다. `DB_PASSWORD`에는 방금 지정한 앱 계정 비밀번호를 넣고, 실제 값은 커밋·공유하지 않습니다.

```dotenv
DB_URL=jdbc:postgresql://127.0.0.1:5432/nadeulirang
DB_USERNAME=nadeulirang
DB_PASSWORD=
```

최초 로컬 준비 과정에서 생성한 관리자·앱 접속 파일은 `.local/postgres-admin-password.txt`·`.local/postgres-admin.pgpass`·`.local/postgres-app.pgpass`입니다. 새 환경에서 위의 프롬프트 방식으로 준비했다면 이 파일들은 자동 생성되지 않으며 `psql -W`로 접속합니다. 현재 준비된 환경에서는 아래 명령으로 비밀번호를 출력하지 않고 앱 계정의 접속을 확인할 수 있습니다.

```powershell
. ./scripts/use-local-env.ps1
$env:PGPASSFILE = Join-Path $PWD '.local/postgres-app.pgpass'
psql -X -w -h 127.0.0.1 -p 5432 -U nadeulirang -d nadeulirang -c "SELECT current_database(), current_user, current_setting('server_encoding'), current_setting('TimeZone');"
Remove-Item Env:PGPASSFILE
```

한글 SQL은 UTF-8 파일로 저장하고 `psql -f <파일>`로 실행합니다. Windows 명령 인수의 한글 인코딩과 서버 UTF-8이 다를 수 있으므로 위 접속 검증 명령은 영문 SQL만 사용합니다.

### DB 시작·종료

저장소 루트에서 실행합니다. DB는 PC 재부팅 후 자동으로 시작하지 않습니다. `status`는 실행 중이면 종료 코드 0, 중지 상태이면 3을 반환합니다. `stop`은 진행 중인 접속을 종료하고 데이터를 정상 저장합니다.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/local-db.ps1 start
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/local-db.ps1 status
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/local-db.ps1 stop
```

데이터는 `.local/postgres-data/`, 서버 로그는 `.local/postgres-server.log`에 보관합니다. `.local/`은 재생성 가능한 실행 파일뿐 아니라 DB 데이터와 접속 정보를 포함하므로 환경 정리 목적으로 폴더 전체를 삭제하지 않습니다.

## 백엔드 실행·검증

공식 [Spring Initializr](https://start.spring.io/)로 Spring Boot 4.1.1 프로젝트를 생성했습니다. 새 프로젝트이므로 안정판 4.1 계열을 사용하고, [공식 요구사항](https://docs.spring.io/spring-boot/system-requirements.html)에서 Java 21 지원을 확인했습니다. Maven은 단일 프로젝트의 표준 `test`·`verify` 흐름과 Windows·Linux 실행을 위해 선택했으며 Wrapper에서 3.9.16으로 고정합니다. 별도 Maven 설치는 필요하지 않습니다. 배포 ZIP을 공식 SHA512와 대조하고 Wrapper에 SHA256 검증을 설정했습니다. 최초 실행에는 Maven Central 다운로드가 필요합니다.

저장소 루트의 PowerShell에서 환경과 DB를 준비하고 실행합니다.

```powershell
. ./scripts/use-local-env.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/local-db.ps1 start
$env:MAVEN_USER_HOME = Join-Path $PWD '.local/maven'
./backend/mvnw.cmd -B -ntp -f backend/pom.xml "-Dmaven.repo.local=$PWD/.local/maven/repository" spring-boot:run
```

기본 포트는 8080이며 종료는 Ctrl+C입니다. [http://localhost:8080/actuator/health](http://localhost:8080/actuator/health)는 DB가 연결되면 HTTP 200과 `{"status":"UP"}`을 반환하고 DB 장애 시 HTTP 503을 반환합니다. Actuator는 health만 공개하며 DB·환경 설정 상세는 공개하지 않습니다. 목록·상세는 `/api/outings`에서 조회하며 조건과 응답은 [백엔드 API 안내](backend/README.md#목록상세-조회-api)를 따릅니다. 실행 중 포트 충돌이 있으면 `"-Dspring-boot.run.arguments=--server.port=8081"`을 추가합니다.

`npm run dev`는 Next.js 프론트만 시작합니다. 프론트의 `http://localhost:3000/api/health`는 현재 라우트·백엔드 전달 설정이 없어 404이며 Spring health와 다른 주소입니다. Spring도 위 명령으로 별도 실행해야 합니다. 서버·포트·경로와 404·접속 실패·503의 차이는 [학습 문서](docs/LEARNING.md#health-주소와-404를-구별하기)를 참고합니다.

일반 서버 실행에서 설정 파일은 Spring이 직접 읽지 않고 `use-local-env.ps1`이 공통/폴더별 설정의 `DB_URL`·`DB_USERNAME`·`DB_PASSWORD`를 현재 세션으로 전달합니다. 실제 비밀번호를 명령 인수에 넣지 않습니다. PostgreSQL JDBC·Flyway·Actuator·Spring MVC를 사용합니다. P11 수집 실행은 아래 전용 실행기로 원천 키만 별도로 읽습니다. JDBC와 Flyway는 같은 전용 스키마를 사용하며 애플리케이션 DB 세션 시간대는 Asia/Seoul입니다.

[Flyway](https://docs.spring.io/spring-boot/how-to/data-initialization.html)만 스키마 변경을 관리합니다. 시작 시 `nadeulirang` 스키마와 그 안의 `flyway_schema_history`를 준비합니다. `V1__initialize_schema.sql`은 스키마 설명을 기록하고 `V2__collection_model.sql`은 원천 호출·제품 항목·원문·필드 근거·연결/검토 이력을 준비합니다. `V3__collection_checkpoint.sql`은 목록 배치의 중간 위치와 성공 목록 응답 연결을 보존합니다. 적용한 마이그레이션을 수정하지 않고 다음 버전 SQL을 추가합니다. 자동 `clean`은 금지하며 `schema.sql`·Hibernate 자동 DDL은 함께 사용하지 않습니다.

DB가 실행 중인 상태에서 루트에서 검증합니다.

```powershell
npm run check:backend
. ./scripts/use-local-env.ps1
$env:MAVEN_USER_HOME = Join-Path $PWD '.local/maven'
./backend/mvnw.cmd -B -ntp -f backend/pom.xml "-Dmaven.repo.local=$PWD/.local/maven/repository" verify
java -jar backend/target/backend-0.0.1-SNAPSHOT.jar
```

`check:backend`는 Windows의 `.local/java`가 있으면 자식 세션에 로컬 환경을 적용하고 Maven `test`를 실행합니다. DB를 자동 시작하지 않으므로 중지 상태에서는 위 시작 명령을 먼저 실행합니다. 테스트는 실제 PostgreSQL 접속·서울 시간대, 마이그레이션·중복 적용 방지, HTTP health와 환경 설정 미노출 및 수집의 중복·충돌·실패 보존·예산·갱신 정책을 검사합니다. 조회 API는 검색·정렬·페이지·서울 날짜 경계·비공개 보호·상세 근거·0건/404/400/503을 검사합니다. 실행마다 임의의 `p10_test_<UUID>`·`p11_test_<UUID>`·`p12_test_<UUID>`·`p38_test_<UUID>` 스키마를 만들고 테스트 종료 단계에서 해당 스키마만 삭제합니다. 프로세스 강제 종료·DB 장애로 정리되지 않은 테스트 스키마는 앱 스키마와 구별하여 따로 정리합니다. 기존 앱·원천 데이터는 테스트에서 삭제하지 않습니다.

`verify`는 같은 테스트와 실행 JAR 빌드를 수행합니다. 테스트 결과는 `backend/target/surefire-reports/`에 있으며 빌드 결과와 로컬 Maven 캐시는 Git에서 제외합니다. Linux에서는 JDK 21과 위 세 DB 환경 변수를 준비하고 `cd backend` 후 `./mvnw -B -ntp verify`로 검증합니다. CI는 PostgreSQL 18.6 서비스를 새로 준비해 이 명령을 실행하며 실제 로컬 비밀번호를 사용하지 않습니다.

## 작업 폴더 사이의 로컬 설정 유지 (P22)

API 키 3개와 DB 접속 설정 3개는 저장소 밖 사용자 홈의 `.nadeulirang/.env`에 보관합니다. 현재 Windows 경로는 `%USERPROFILE%\.nadeulirang\.env`입니다. 같은 PC의 새 브랜치·작업 폴더에서는 설정을 다시 입력하지 않고 공통 파일을 읽습니다. 저장소의 `.env`·공통 파일은 Git으로 관리하지 않습니다.

기존 루트 `.env`에 6개 값을 준비한 뒤 한 번 보관합니다. 루트 `.env`의 값을 바꾼 뒤에도 같은 명령으로 공통 파일을 갱신할 수 있습니다.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/save-local-settings.ps1
```

보관 스크립트는 기존 공통 값과 폴더별 값을 합치고 6개 항목이 모두 있어야 저장합니다. 임시 파일에서 교체하며 값은 출력하지 않습니다. Windows 파일 권한은 현재 사용자·SYSTEM으로 제한합니다. 새 보관 파일을 만들 때와 기존 파일을 갱신할 때 모두 같은 제한을 적용합니다. 값은 한 줄로 쓰며 따옴표 안의 내용도 코드·이스케이프로 실행하지 않습니다.

읽기 우선순위는 **공통 파일 → 폴더별 `.env`의 비어 있지 않은 값**입니다. 폴더별 빈 입력란은 공통 값을 지우지 않습니다. 다른 DB를 사용하는 폴더는 자체 `.env`에 접속 설정을 넣을 수 있습니다. 공통 파일을 직접 수정했다면 기존 폴더의 같은 항목에 값이 남아 있는지 확인합니다. `use-local-env.ps1`·P06 검증 도구·P11 수집기가 이 순서를 사용하며 `.env.example`은 실행에 사용하지 않습니다.

공통 설정은 같은 PC에서 유지하는 파일이며 다른 PC·배포 서버에 자동 동기화되지 않습니다. 다른 PC는 접근을 제한한 공통 설정 파일을 별도로 준비하고, 실제 운영 서버의 승인된 원천 키·운영 DB 정보는 P15에서 배포 환경의 비밀 설정으로 등록·검증합니다. JDK·PostgreSQL 설치와 DB 데이터·관리자 접속 파일은 이 6개 설정 보관에 포함하지 않습니다.

## 데이터 수집 (P11·P38)

수집 코드·모델과 세 원천의 실제 수집·저장·재실행 검증을 마쳤습니다. 공개 후보의 지역·종류·건수와 종료/검토 대기 범위는 [PLAN](PLAN.md#기능과-공개-준비)에서 관리합니다. 테스트의 가상 데이터를 공개 확보 건수로 세지 않습니다.

원천 키 3개와 DB 접속 설정은 아래 공통 로컬 설정으로 작업 폴더 사이에서 유지할 수 있습니다. 기존 `.env`를 `.env.example`로 덮어쓰지 않습니다. `.env`는 Git에서 제외되며 수집기는 파일을 코드로 실행하지 않고 원천 키만 읽습니다. 실행 파일·DB 데이터는 별도로 준비하며 공통 설정 보관이 이를 복사하거나 DB를 시작하지는 않습니다.

DB가 실행 중일 때 저장소 루트에서 실행합니다.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/collect-data.ps1 -Mode batch -MaxItems 100
```

기본 `batch`는 TourAPI의 행사·박물관·역사 문화관광지와 두 표준 원천의 전국 목록을 읽습니다. 요청당 20건, 실행당 후보 5~100개를 다섯 목록에 나눠 처리하며 목록 호출 최대 100회·공통/소개/반복을 포함한 전체 호출 최대 400회입니다. TourAPI 행사는 실행 월의 1년 전부터 3개월 뒤 전날까지의 조회 범위에서 이미 종료된 항목을 제외합니다. 날짜 없는 항목은 검토 대기로 보존하며 이 구간 밖의 장기 행사를 모두 확보했다는 뜻은 아닙니다. 표준 축제도 종료된 회차는 건너뜁니다. 다른 목록의 빈 결과·종료 항목으로 남은 할당량을 임의로 이전하지 않아 실제 저장 수는 상한보다 작을 수 있습니다. 이미지·웹페이지·전국 전량·예약 작업은 수집하지 않습니다. Spring의 웹 서버는 열지 않고 실행 후 종료합니다.

`collection_checkpoint`가 목록별 페이지·행 위치와 성공 응답을 저장합니다. 같은 명령을 다시 실행하면 부분 페이지의 보존된 응답에서 이어가며 신규 항목의 원천 식별자가 중복 생성되지 않습니다. 상세 실패는 해당 후보 위치를 진행하지 않습니다. 기본 배치 이름은 서울 날짜의 `YYYY-MM`이며 같은 달에 재실행하면 이어가고 새 달은 새 목록 순회를 시작합니다. `-Campaign local-check`처럼 별도 이름을 지정하면 새로운 순회를 시작합니다. 원천 목록 자체의 순서·건수가 바뀌면 페이지 경계에서 누락/중복 재조회가 생길 수 있으므로 커서는 전체 최신 변경 추적을 보장하지 않습니다. 변경 추적·정기 갱신은 P15에서 검증합니다.

새 후보는 원문·필드 근거·출처·확인 시각과 함께 검토 대기로 저장하며 즉시 화면에 공개하지 않습니다. 기존 검토 목록 또는 DB의 승인 기록과 이름·종류·시도 주소가 일치한 TourAPI 항목은 공개 검토를 유지하고 불일치는 다시 검토 대기로 둡니다. DB에 저장한 수, 원천별 중복 후보, 검토를 통과한 공개 수는 구분합니다. 기관의 당일 운영·할인·예약은 원천 목록 조회 성공만으로 확정하지 않습니다.

기존 표본 갱신은 `-Mode seed`로 [collection-seed.json](backend/src/main/resources/collection-seed.json)의 TourAPI 7개와 표준 이름 검색 4개를 사용하며 전체 호출 100회 상한을 유지합니다. 별도로 종류·시도·주소·이용허락을 대조한 검토 목록은 같은 JSON의 `tour`·`standard` 배열 형식으로 Git에서 제외한 로컬 파일에 보관하고 `-Mode seed -SeedFile .local/reviewed-collection.json`으로 재조회할 수 있습니다. 목록 파일을 생성한 것만으로 검토 완료로 취급하지 않으며 이름/종류/시도 주소가 실제 공통 응답과 일치해야 공개 후보가 됩니다. 검토되지 않은 교차 원천의 같은 이름은 자동 합치지 않습니다.

원천별 세션 잠금과 최소 1초 시작 간격, DB에 보존하는 24시간 이동 예산을 사용합니다. 성공·실패·실행 중 시도도 차감합니다. `20`·`22`·`23`·`30`·`31`을 받으면 해당 원천을 중단하고 자동 재시도하지 않습니다. `23`도 현재 실행에서 재시도하지 않고 다음 실행으로 이월합니다. 중단 사유는 `collection_source.blocked_reason`에 남으며 인증·기간·한도 또는 속도 설정을 확인한 뒤 그 원천의 중단 상태만 수동 해제해야 합니다. 예산 기록은 삭제하지 않습니다.

수집기는 종류·시도 코드·주소를 재대조한 항목만 공개 후보로 승인하고, 불일치는 검토 대기로 둡니다. 시도 목록은 `ldongCode2`의 기본 조회로 확보하며 `lDongListYn=Y`의 구·군 목록과 구분합니다. 표준데이터 교차 연결은 P06에서 기관 소개로 확인한 두 시설만 사용합니다. 이미 보류 상태로 저장했던 원천도 `CollectionStore.relink`가 검토 근거와 연결 이력을 남깁니다. 다른 이름 중복·이전 ID는 자동 통합하지 않습니다. 원문·수정 시각·기준일·필드별 출처는 보존하고 조건 요금·할인·휴관 문장을 추정해 정규화하지 않습니다. 같은 정상 응답 안의 상충 요금도 한 행을 임의로 채택하지 않습니다. 현재 날짜 운영 검토는 기본 미확인입니다. 변경 목록은 첫 20건의 비표출 표본만 확인하므로 전체 상태 추적과 자동 갱신 스케줄은 P15에서 보완합니다. 저장한 자료의 화면/API 조회는 P12·P13에서 구현했으며 [API 계약](backend/README.md#목록상세-조회-api)을 따릅니다.

## 원천 API 표본 검증

P06 검증 도구도 수집기·환경 적용 스크립트와 같은 공통/폴더별 설정을 읽습니다.

P06의 TourAPI 인증·표본 조회는 저장소 루트에서 실행합니다. 처음 설정할 때 `.env.example`을 `.env`로 복사하고 루트 `.env`에 `TOURAPI_SERVICE_KEY=발급받은 Decoding 인증키`를 저장합니다. 이미 키를 넣은 `.env`는 다시 복사해 덮어쓰지 않습니다. 두 파일의 변수 이름은 같고 예시 값은 비워 둡니다. `.env`는 Git에서 제외되며 로컬 환경 스크립트·검증 도구·P11 수집기만 명시적으로 읽습니다. 프론트에 키를 넣거나 `NEXT_PUBLIC_` 변수로 노출하지 않습니다.

```powershell
node scripts/verify-tourapi.mjs
node scripts/verify-tourapi.mjs searchKeyword2 '{"keyword":"클레이아크","numOfRows":5}'
node scripts/verify-tourapi.mjs detailIntro2 '{"contentId":"130841","contentTypeId":14}'
node scripts/verify-tourapi.mjs ldongCode2 '{"numOfRows":1}' xml
```

두 보완 원천의 활용신청 후 `.env`의 `FESTIVAL_SERVICE_KEY`(축제)·`MUSEUM_SERVICE_KEY`(박물관·미술관)에 각 서비스의 Decoding 키를 저장하고 아래 명령으로 조회합니다.

```powershell
node scripts/verify-standard-data.mjs festival
node scripts/verify-standard-data.mjs museum '{"fcltyNm":"클레이아크 김해미술관","numOfRows":5}'
node scripts/verify-standard-data.mjs festival '{"numOfRows":1}' xml
```

표준데이터 도구는 두 공식 주소만 호출하며 요청 크기·시간·출력 제한은 TourAPI 도구와 같습니다. 표준 원천의 정상 코드는 `00`이며 데이터 없음 코드 `03`은 인증·조회 실패와 구분합니다. 실제 키를 명령 인수로 전달하지 않습니다.

TourAPI 도구의 기본 요청은 법정동코드 5건 조회입니다. 공식 `KorService2`의 허용된 오퍼레이션만 호출하고 요청당 최대 20건·20초로 제한합니다. 요청은 1회이며 자동 재시도나 전체 수집은 하지 않습니다. HTTP 상태와 원천 결과 코드 `0000` 및 응답 본문 구조를 검사하고 빈 결과와 실패를 구분합니다. 키·요청 URL·원본 오류는 출력하지 않으며 허용한 공개 필드만 요약합니다. XML은 결과 코드·건수만 확인하고 항목 본문을 해석하지 않습니다. 검증한 계정 한도·이용 조건·표본과 P11 수집 기준은 [원천 검토](docs/DATA_SOURCES.md)에 기록합니다. 도구의 조회 성공은 시설의 당일 운영 확인과 구분합니다.

공통 개발 도구의 실행 코드는 `scripts/`, 해당 도구의 테스트는 `tests/tooling/`에 둡니다. 프론트·백엔드 기능 테스트는 각 프로젝트 내부에서 관리합니다.

## 커밋 검사

저장소 루트에서 최초 복제 후 한 번 실행합니다. 루트 패키지는 별도 설치할 의존성이 없으며 프론트 의존성은 위의 `npm ci`로 설치합니다.

```powershell
npm run setup:hooks
```

이후 `git commit`은 공백 오류와 환경 설정·키 파일명을 확인하고, 변경 코드에 필요한 검사만 실행합니다. 실패하면 커밋을 중단합니다.

| 변경 내용 | 커밋 시 코드 검사 |
|---|---|
| 문서만 변경 | 생략. 문서 링크·계획·기록은 수정 시 직접 확인 |
| 프론트 코드·설정 변경 | lint·타입 검사 (`npm --prefix frontend run check:quick`) |
| 백엔드 코드·설정, 백엔드 검사 도구·환경 적용·공통 설정/보관·수집 실행 스크립트 변경 | 실제 PostgreSQL 기반 테스트 (`npm run check:backend`). JDK 21·DB 실행·접속 환경 필요 |
| 공통 도구·검사 설정 변경 | 커밋 차단·API 검증 도구 테스트 (`npm test`) |

검사 대상 코드에는 미스테이징 변경이 없어야 합니다. 전체 빌드는 매 커밋에 실행하지 않고 기능 완료·PR 전 또는 CI에서 프론트는 `npm --prefix frontend run check`, 백엔드는 Maven `verify`로 확인합니다. 기능 테스트는 실제 로직과 실패 위험이 생길 때 필요한 범위만 추가합니다.

제목은 `type(scope): 한국어 설명` 형식이며 72자 이내입니다. 제목 뒤 빈 줄과 한국어 본문이 필요합니다. 본문에는 변경 이유·내용·검증 결과를 적습니다. 분류 코드와 범위는 영문을 유지하고 설명은 한국어로 작성합니다. 테스트 이름·주석·직접 작성하는 검사 안내도 한국어로 작성합니다. 유형·브랜치·묶음 기준은 [AGENTS](AGENTS.md#브랜치와-커밋)에서 관리합니다.

```text
feat(search): 지역별 행사 검색 추가

이유: 지역을 선택해 나들이 후보를 좁힐 수 있도록 한다.
내용: 지역 필터와 검색 API를 연결한다.
검증: 지역 변경·결과 없음 테스트 및 프론트 검사 통과.
```

수동 검사는 루트에서 `npm run check:commit`, 도구 테스트는 `npm test`로 실행합니다. GitHub의 [CI 설정](.github/workflows/ci.yml)은 코드·검사 설정을 변경한 push·PR에서 도구 테스트와 프론트·백엔드 검사를 실행합니다. 로컬 훅은 사용자 설정으로 우회할 수 있습니다. main 보호를 설정할 때에는 첫 CI 실행과 문서 전용 PR의 검사 생략 정책도 함께 확인합니다. 경로 필터로 생략된 CI를 그대로 필수 검사로 지정하면 문서 전용 PR의 병합이 대기할 수 있습니다. [GitHub 공식 안내](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onpushpull_requestpull_request_targetpathspaths-ignore)

## PowerShell에서 npm이 차단될 때

npm.ps1 또는 npx.ps1의 PSSecurityException은 폴더 위치와 별개인 실행 정책 오류입니다. 오류가 발생한 터미널에서 `Get-ExecutionPolicy -List`로 확인합니다. 별도 터미널의 성공만으로 이 터미널에서도 해결됐다고 판단하지 않습니다.

개인 개발 PC에서 현재 사용자 범위에 RemoteSigned를 적용하려면 `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`를 실행합니다. 조직·Process 정책이 우선하는 경우 결과를 확인한 뒤 대응합니다. 정책을 변경하지 않는 대안은 `npm.cmd`·`npx.cmd`입니다.

- [Next.js 공식 문서](https://nextjs.org/docs)
- [PowerShell 실행 정책](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_execution_policies)
