# 루트 .env를 보존한 채 수집용 Spring 실행을 시작한다. 원천 키를 인수로 전달하지 않는다.
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
    . ./scripts/use-local-env.ps1
    $env:MAVEN_USER_HOME = Join-Path $projectRoot '.local/maven'
    & ./backend/mvnw.cmd -B -ntp -f backend/pom.xml "-Dmaven.repo.local=$projectRoot/.local/maven/repository" spring-boot:run `
        '-Dspring-boot.run.arguments=--collection.run=true --collection.env-file=../.env --spring.main.web-application-type=none'
    if ($LASTEXITCODE -ne 0) { throw '수집 실패. 키·DB 설정과 원천 호출 결과를 확인하세요. 실패한 원천은 자동 재시도하지 않습니다.' }
} finally { Pop-Location }
