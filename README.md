# 나들이랑 (nadeulirang)

전국 축제·행사·전시·박물관·문화관광지의 일정, 요금, 할인 조건을 검색·비교하는 개인 웹 서비스입니다. 검색 유입과 광고 수익을 목표로 합니다.

## 기술 구성

- 프론트엔드: React 기반 Next.js + TypeScript
- 백엔드: Spring Boot + Java 21
- 데이터베이스: PostgreSQL

## 문서 안내

| 문서 | 역할 |
|---|---|
| [PLAN.md](PLAN.md) | 항목 번호·완료 기준이 있는 작업 체크리스트 |
| `docs/WORKLOG.md` (로컬 전용) | PLAN 항목에 연결한 날짜별 결과·검증·리뷰. Git 추적 제외 |
| [docs/PRD.md](docs/PRD.md) | 제품 요구사항: 무엇을 만들고 어떤 동작을 제공할지 |
| [DESIGN.md](DESIGN.md) | 디자인 후보와 확정 결과 |
| [AGENTS.md](AGENTS.md) | 계획에 따른 작업·검증·기록 규칙 |
| [frontend/AGENTS.md](frontend/AGENTS.md) | Next.js 작업에 필요한 추가 안내 |
| [frontend/README.md](frontend/README.md) | 프론트 폴더 안내와 공통 문서 연결 |

## 작업 흐름

PLAN의 항목 선택 → 작업·검증·리뷰 → 같은 번호로 WORKLOG 기록 → 완료 기준을 충족하면 PLAN에 ✅를 표시합니다. 미완료 항목은 [ ]로 유지합니다.

완료한 플랜의 변경은 검증·자체 리뷰와 커밋 훅 검사를 통과하면 자동으로 로컬 커밋합니다. 커밋 묶음과 포함 범위는 [AGENTS의 브랜치와 커밋](AGENTS.md#브랜치와-커밋)을 따릅니다. 푸시·PR 생성·main 반영·배포는 별도로 허용된 요청 범위에서 수행합니다.

PLAN은 Git으로 공유하고 WORKLOG는 로컬에 보관합니다. 새로 복제한 환경에서는 첫 결과 기록 시 WORKLOG를 생성합니다. 생성 형식과 관리 규칙은 [AGENTS의 로컬 작업 기록](AGENTS.md#로컬-작업-기록)을 따릅니다. 변경 이유·검증 결과는 해당 커밋·PR 본문에도 남깁니다.

일일 계획은 기존 미완료 항목에서 선택합니다. 여러 날에 걸친 작업은 같은 번호를 유지하고 WORKLOG에 날짜별 결과를 남깁니다.

PRD는 제품 기준, DESIGN은 디자인 결정을 담습니다. README와 AGENTS에는 매 작업의 진행 상태를 복사하지 않고 안내·규칙이 바뀔 때만 반영합니다. 구체적인 관리 규칙은 AGENTS를 참고합니다.

커밋 전 변경 diff를 자체 리뷰하고 검토 범위·발견한 문제·처리를 WORKLOG에 짧게 남깁니다. 검증 명령의 성공과 리뷰 결과는 구분하며, 미검토 내용은 완료한 리뷰로 기록하지 않습니다. 리뷰 기준은 [AGENTS](AGENTS.md#코드문서-리뷰)를 따릅니다.

“리뷰 후 PR·자동 머지까지” 요청하면 검토·필요한 수정·검증 후, 미커밋 변경을 저장하고 푸시·PR·조건 충족 후 머지까지 진행합니다. 머지 성공을 확인하면 main으로 돌아오고 해당 작업의 로컬·원격 브랜치도 정리합니다. 반영되지 않은 변경이 있으면 보존하고 정리를 보류합니다. 리뷰만 요청했을 때의 작업 범위와 상세 규칙은 [브랜치와 커밋](AGENTS.md#브랜치와-커밋)을 참고합니다. 자동 머지는 저장소에서 활성화하고 필수 검사·리뷰 조건을 충족해야 합니다. [GitHub 자동 머지 안내](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/automatically-merging-a-pull-request)

## 프론트 실행

Node.js 24 LTS와 npm을 사용합니다. frontend 기본 프로젝트는 이미 생성되어 있습니다. 저장소 루트에서 다음 명령을 실행합니다.

```powershell
cd frontend
npm ci
npm run dev
```

npm ci는 처음 복제하거나 의존성이 변경되었을 때 실행합니다. 이후에는 npm run dev로 시작합니다. 접속 주소는 [http://localhost:3000](http://localhost:3000)이며, 포트가 다르면 터미널에 출력된 주소를 사용합니다.

루트 폴더에서 바로 시작하려면 `npm --prefix frontend run dev`를 사용합니다. 개발 서버 종료는 Ctrl+C입니다.

## 프론트 검증

frontend 폴더에서 실행합니다.

```powershell
npm run lint
npm run typecheck
npm run build
```

백엔드·DB 설치와 실행 안내는 해당 프로젝트를 준비한 뒤 추가합니다.

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
| 커밋 도구 변경 | 도구 핵심 테스트 3개 (`npm test`) |

검사 대상 코드에는 미스테이징 변경이 없어야 합니다. 전체 빌드는 매 커밋에 실행하지 않고 기능 완료·PR 전 또는 CI에서 `npm --prefix frontend run check`로 확인합니다. 기능 테스트는 실제 로직과 실패 위험이 생길 때 필요한 범위만 추가합니다.

제목은 `type(scope): 한국어 설명` 형식이며 72자 이내입니다. 제목 뒤 빈 줄과 한국어 본문이 필요합니다. 본문에는 변경 이유·내용·검증 결과를 적습니다. 분류 코드와 범위는 영문을 유지하고 설명은 한국어로 작성합니다. 테스트 이름·주석·직접 작성하는 검사 안내도 한국어로 작성합니다. 유형·브랜치·묶음 기준은 [AGENTS](AGENTS.md#브랜치와-커밋)에서 관리합니다.

```text
feat(search): 지역별 행사 검색 추가

이유: 지역을 선택해 나들이 후보를 좁힐 수 있도록 한다.
내용: 지역 필터와 검색 API를 연결한다.
검증: 지역 변경·결과 없음 테스트 및 프론트 검사 통과.
```

수동 검사는 루트에서 `npm run check:commit`, 도구 테스트는 `npm test`로 실행합니다. GitHub의 [CI 설정](.github/workflows/ci.yml)은 코드·검사 설정을 변경한 push·PR에서 도구 테스트와 프론트 검사를 실행합니다. 로컬 훅은 사용자 설정으로 우회할 수 있습니다. main 보호를 설정할 때에는 첫 CI 실행과 문서 전용 PR의 검사 생략 정책도 함께 확인합니다. 경로 필터로 생략된 CI를 그대로 필수 검사로 지정하면 문서 전용 PR의 병합이 대기할 수 있습니다. [GitHub 공식 안내](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onpushpull_requestpull_request_targetpathspaths-ignore)

## PowerShell에서 npm이 차단될 때

npm.ps1 또는 npx.ps1의 PSSecurityException은 폴더 위치와 별개인 실행 정책 오류입니다. 오류가 발생한 터미널에서 `Get-ExecutionPolicy -List`로 확인합니다. 별도 터미널의 성공만으로 이 터미널에서도 해결됐다고 판단하지 않습니다.

개인 개발 PC에서 현재 사용자 범위에 RemoteSigned를 적용하려면 `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`를 실행합니다. 조직·Process 정책이 우선하는 경우 결과를 확인한 뒤 대응합니다. 정책을 변경하지 않는 대안은 `npm.cmd`·`npx.cmd`입니다.

- [Next.js 공식 문서](https://nextjs.org/docs)
- [PowerShell 실행 정책](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_execution_policies)
