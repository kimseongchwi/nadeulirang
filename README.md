# 나들이랑 (nadeulirang)

전국 축제·행사·전시·박물관·문화관광지를 발견하고 일정·요금·방문 정보를 공식 출처로 확인하는 개인 웹 서비스입니다. Java·Spring·React 학습과 검색 유입·광고 수익을 함께 목표로 합니다. 첫 공개 범위와 후속 기능은 [PRD](docs/PRD.md), 작업 상태는 [PLAN](PLAN.md)을 따릅니다.

## 기술 구성

Next.js 16.3.8·React 19.2.8·TypeScript strict / Spring Boot 4.1.1·Java 21·Maven Wrapper 3.9.16 / PostgreSQL 18.6·Spring Data JPA·Hibernate·Flyway를 사용합니다.

## 빠른 실행

Node.js 24와 아래 로컬 JDK·DB를 준비한 환경에서 저장소 루트의 PowerShell 터미널 두 개로 실행합니다. npm.ps1이 차단되면 npm.cmd를 사용합니다.

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

## UI 디자인 가이드 확인

같은 개발 서버의 [/ui-design](http://localhost:3000/ui-design)에서 공유 UI와 320/390/430px 미리보기를 확인합니다. 가이드 표본은 서비스 오류의 대체 데이터로 사용하지 않습니다. iframe은 실제 서비스 페이지이므로 백엔드가 필요합니다. 구조·가이드 사용법은 [프론트 README](frontend/README.md), 현재 적용/미정 기준은 [DESIGN](DESIGN.md)을 따릅니다. 공개 SEO 점검 전 noindex를 유지합니다(P14).

## 백엔드 개발 환경

실행 파일·DB·접속 정보는 Git에서 제외한 .local/에 두며 시스템 PATH·Windows 서비스는 등록하지 않습니다. 이 폴더 전체를 환경 정리 목적으로 삭제하지 않습니다.

### JDK 21

[Temurin 공식 배포](https://adoptium.net/temurin/releases/?version=21&os=windows&arch=x64)의 Windows x64 JDK ZIP을 받아 공식 SHA256과 Get-FileHash 결과를 대조합니다. .local/java/jdk-21.<버전>/bin/java.exe 구조로 JDK 하나를 둡니다. use-local-env.ps1은 현재 세션의 JAVA_HOME·PATH·DB 변수만 적용합니다. 스크립트가 차단될 때만 현재 세션에서 Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass를 사용합니다.

### PostgreSQL

[PostgreSQL Windows 안내](https://www.postgresql.org/download/windows/)의 [EDB 바이너리](https://www.enterprisedb.com/download-postgresql-binaries)에서 PostgreSQL 18 ZIP을 받아 .local/postgresql/pgsql/{bin,lib,share}에 둡니다. 아래 초기화는 DB가 없는 환경에서 한 번만 수행하며 기존 .local/postgres-data는 재초기화·삭제하지 않습니다. 5432가 사용 중이면 기존 DB를 종료하지 않고 접속 포트를 조정합니다.

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

기존 .env를 덮어쓰지 않고 [.env.example](.env.example)의 DB_URL·DB_USERNAME·DB_PASSWORD를 추가합니다. JDBC 주소는 jdbc:postgresql://127.0.0.1:5432/nadeulirang입니다. 초기 환경의 관리자/앱 접속 파일은 .local/postgres-admin-password.txt·postgres-admin.pgpass·postgres-app.pgpass에 있으며 새 환경의 프롬프트 초기화는 이 파일을 생성하지 않습니다. 일반 접속 확인은 psql -X -h 127.0.0.1 -p 5432 -U nadeulirang -d nadeulirang -W로 수행합니다. 한글 SQL은 UTF-8 파일과 psql -f를 사용합니다.

### DB 시작·종료

~~~powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/local-db.ps1 status
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/local-db.ps1 start
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/local-db.ps1 stop
~~~

status의 종료 코드는 실행 중 0·중지 3입니다. 재부팅 뒤 자동 시작하지 않으며 stop은 진행 접속을 종료하고 정상 저장합니다. 데이터는 .local/postgres-data/, 로그는 .local/postgres-server.log입니다.

## 작업 폴더 사이의 로컬 설정 유지 (P22)

사용자 홈 .nadeulirang/.env의 원천 키 3개와 DB 설정 3개를 읽고 폴더별 .env의 비어 있지 않은 값만 우선합니다. 파일을 코드로 실행하지 않으며 실제 값은 출력·커밋하지 않습니다. 루트 .env에 6개 항목을 준비한 뒤 필요한 경우에만 보관합니다.

~~~powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/save-local-settings.ps1
~~~

이 명령은 공통 파일을 갱신하고 Windows 접근 권한을 현재 사용자·SYSTEM으로 제한합니다. 작업 폴더 정리는 공통 파일을 삭제하지 않습니다. 다른 PC·배포 서버로 자동 복사하지 않으며 운영 비밀 설정은 P15에서 별도로 준비합니다.

## 필수 검증

DB를 시작한 뒤 루트에서 실행합니다. 프론트만 변경했으면 프론트 검사만 수행합니다.

~~~powershell
npm --prefix frontend run check:quick  # lint·Next 경로 생성·strict 타입
npm --prefix frontend test            # 프론트 로직·응답 계약 회귀
npm --prefix frontend run build
npm test                             # 개발 도구 핵심 검증
npm run check:backend                 # 실제 PostgreSQL 기반 Maven test
~~~

### 백엔드 실행·검증

기능 완료·PR 전에는 테스트와 실행 JAR 생성을 함께 확인합니다.

~~~powershell
. ./scripts/use-local-env.ps1
$env:MAVEN_USER_HOME = Join-Path $PWD '.local/maven'
./backend/mvnw.cmd -B -ntp -f backend/pom.xml "-Dmaven.repo.local=$PWD/.local/maven/repository" verify
java -jar backend/target/backend-0.0.1-SNAPSHOT.jar
~~~

check:backend는 자식 세션에 로컬 환경을 적용하며 DB 자체는 시작하지 않습니다. 테스트는 실행별 UUID 스키마에서 마이그레이션·API·날짜/요금·중복/실패·JPA/SQL 트랜잭션을 검사하고 해당 스키마만 제거합니다. 결과는 backend/target/surefire-reports/입니다. Linux·CI는 JDK 21·DB 변수 세 개를 준비하고 backend에서 ./mvnw -B -ntp verify를 실행합니다. CI는 전용 PostgreSQL 서비스와 임시 인증값을 사용합니다.

## 데이터 수집 (P11·P38)

수집은 수동 실행이며 원천·예산·식별자·원문/실패 보존·갱신 기준은 [DATA_SOURCES](docs/DATA_SOURCES.md#p11-수집-기준)에서 관리합니다. 일반 서버 시작은 수집하지 않습니다. 원천별 Decoding 키를 .env 또는 공통 설정에 넣고 DB를 시작한 뒤 실행합니다.

~~~powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/collect-data.ps1 -Mode batch -MaxItems 100
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/collect-data.ps1 -Mode seed
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/collect-data.ps1 -Mode seed -SeedFile .local/reviewed-collection.json
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/collect-data.ps1 -Mode supplement -SeedFile .local/supplement-targets.json -Operations detailIntro2,detailInfo2
~~~

batch는 다섯 전국 목록에 후보 5~100개를 나눠 처리합니다. 기본 campaign은 서울 YYYY-MM이고 동일 명령은 저장된 페이지/행부터 이어갑니다. -Campaign local-check는 새 순회입니다. 실패 후보는 진행하지 않고 새 후보는 검토 대기로 저장합니다. seed 양식은 [collection-seed.json](backend/src/main/resources/collection-seed.json)의 tour·standard 배열을 따릅니다. supplement는 저장 원문 대조 뒤 부족한 기존 대상/오퍼레이션만 지정합니다. 사진은 허용 메타데이터만 저장하며 웹페이지·사진 본문 복제와 운영 크론은 제공하지 않습니다.

## 원천 API 표본 검증

아래 도구는 원천 키를 설정 파일에서 읽고 공식 주소·허용 오퍼레이션에 한정해 1회·최대 20건을 조회합니다. 인증키·요청 URL·민감한 오류 원문은 출력하지 않습니다. 목록 조회 성공은 당일 운영 확인이 아닙니다.

~~~powershell
node scripts/verify-tourapi.mjs
node scripts/verify-tourapi.mjs detailIntro2 '{"contentId":"130841","contentTypeId":14}'
node scripts/verify-standard-data.mjs museum '{"fcltyNm":"클레이아크 김해미술관","numOfRows":5}'
node scripts/verify-standard-data.mjs festival '{"numOfRows":1}' xml
~~~

## 커밋 검사

최초 복제 뒤 npm run setup:hooks로 로컬 훅을 연결합니다. 훅은 공백·민감한 파일명·한국어 커밋 형식을 확인하고 변경 코드에 필요한 검사만 실행합니다.

| 변경 | 검사 |
|---|---|
| 문서 | 코드 검사 생략, 링크·상태 자체 확인 |
| 프론트 코드/설정 | check:quick |
| 백엔드 코드/설정·DB 환경/수집 실행 도구 | check:backend |
| 공통 도구·훅/CI | 루트 npm test |

검사 대상 코드에 미스테이징 변경이 있으면 중단합니다. 전체 빌드는 기능 완료·PR 전 또는 [CI](.github/workflows/ci.yml)에서 확인합니다. CI는 코드 경로 변경 시 실행되므로 문서 전용 PR의 검사 생략과 저장소 필수 조건을 대조해야 합니다. 권한·목적별 커밋·리뷰 규칙은 [AGENTS](AGENTS.md)를 따릅니다.

## 문서 안내

| 문서 | 역할 |
|---|---|
| [PLAN](PLAN.md) | 범위·완료 기준·현재 상태 |
| [PRD](docs/PRD.md) | 제품 기준·공개 범위 |
| [DESIGN](DESIGN.md) | 현재 적용·미정 디자인 |
| [DATA_SOURCES](docs/DATA_SOURCES.md) | 원천·근거·이용 조건·수집/갱신 기준 |
| [LEARNING](docs/LEARNING.md) | 현재 코드의 개념·파일·호출 흐름·선택 이유 |
| [frontend/README](frontend/README.md) | 프론트 구조·UI 가이드 |
| [backend/README](backend/README.md) | 백엔드 구조·API·응답/오류 계약 |
| [AGENTS](AGENTS.md)·[프론트 추가 지침](frontend/AGENTS.md) | 공통·영역 개발 규칙 |

로컬 docs/WORKLOG.md는 실제 결과, docs/ERRORS.md는 오류 요약이며 Git 추적에서 제외합니다.

### 저장 사진 재처리·제한 보완

개별 검토 목록 형식·보존·예산 기준은 [DATA_SOURCES](docs/DATA_SOURCES.md#사진-조사와-제한-보완--p76)를 따릅니다. 저장 원문 재처리는 추가 호출 없이 실행합니다.

~~~powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/collect-data.ps1 -Mode photos-replay -SeedFile .local/photo-replay.json
# 실제 추가 호출은 현재 계정 확인 후에만 실행. photoCampaign·검토 photoUrls가 있는 기존 대상 파일 필요
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/collect-data.ps1 -Mode supplement -SeedFile .local/photo-targets.json -Operations detailImage2 -AccountLimit <현재한도> -QuotaRemaining <현재잔량> -QuotaCheckedAt <UTC확인시각> -PhotoCallBudget 2
~~~
