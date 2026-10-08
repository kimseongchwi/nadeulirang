param(
    [ValidateSet('batch', 'seed', 'supplement')][string]$Mode = 'batch',
    [ValidateRange(5, 100)][int]$MaxItems = 100,
    [ValidatePattern('^[A-Za-z0-9_-]{1,40}$')][string]$Campaign,
    [string]$SeedFile,
    [ValidateSet('detailIntro2', 'detailInfo2')][string[]]$Operations = @('detailIntro2', 'detailInfo2')
)
# 루트 .env를 보존한 채 수집용 Spring 실행을 시작한다. 원천 키를 인수로 전달하지 않는다.
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
    . ./scripts/use-local-env.ps1
    $env:MAVEN_USER_HOME = Join-Path $projectRoot '.local/maven'
    $collectionArguments = "--collection.run=true --collection.mode=$Mode --collection.max-items=$MaxItems --collection.env-file=../.env --spring.main.web-application-type=none"
    if ($Mode -eq 'supplement') {
        if (-not $SeedFile) { throw '보완 수집에는 기존 대상 목록 SeedFile이 필요합니다.' }
        $collectionArguments += " --collection.operations=$($Operations -join ',')"
    }
    if ($Campaign) { $collectionArguments += " --collection.campaign=$Campaign" }
    if ($SeedFile) {
        $seedPath = (Resolve-Path -LiteralPath $SeedFile).Path
        if ($seedPath -match '["\r\n]') { throw '검토 목록 경로에 따옴표나 줄바꿈을 사용할 수 없습니다.' }
        $collectionArguments += " --collection.seed-file=`"$seedPath`""
    }
    & ./backend/mvnw.cmd -B -ntp -f backend/pom.xml "-Dmaven.repo.local=$projectRoot/.local/maven/repository" spring-boot:run `
        "-Dspring-boot.run.arguments=$collectionArguments" '-Dspring-boot.run.jvmArguments=-Dstdout.encoding=UTF-8 -Dstderr.encoding=UTF-8'
    if ($LASTEXITCODE -ne 0) { throw '수집 실패. 키·DB 설정과 원천 호출 결과를 확인하세요. 실패한 원천은 자동 재시도하지 않습니다.' }
} finally { Pop-Location }
