param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('start', 'stop', 'status')]
    [string]$Action
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$pgCtl = Join-Path $projectRoot '.local/postgresql/pgsql/bin/pg_ctl.exe'
$dataPath = Join-Path $projectRoot '.local/postgres-data'
$logPath = Join-Path $projectRoot '.local/postgres-server.log'
if (-not (Test-Path -LiteralPath $pgCtl) -or -not (Test-Path (Join-Path $dataPath 'PG_VERSION'))) {
    throw '로컬 PostgreSQL 배포본과 초기 DB가 필요합니다. README의 백엔드 개발 환경을 참고하세요.'
}

& $pgCtl -D $dataPath status
$statusCode = $LASTEXITCODE
if ($statusCode -notin @(0, 3)) { throw '로컬 DB 상태 확인 실패. 데이터 폴더의 접근 권한을 확인하세요.' }
$running = $statusCode -eq 0
if ($Action -eq 'status') {
    if (-not $running) { Write-Host '로컬 DB가 중지되어 있습니다.' }
    exit $statusCode
}
if ($Action -eq 'start') {
    if ($running) { Write-Host '로컬 DB가 이미 실행 중입니다.'; exit 0 }
    # 별도 창을 띄우지 않고 로그 파일로 출력한다.
    $pgProcess = Start-Process -FilePath $pgCtl -ArgumentList @(
        '-D', ('"{0}"' -f $dataPath), '-l', ('"{0}"' -f $logPath), '-w', 'start'
    ) -WindowStyle Hidden -PassThru
    # -Wait는 서버 자식 프로세스까지 기다리므로 pg_ctl만 기다린다.
    $pgProcess.WaitForExit()
    if ($pgProcess.ExitCode -ne 0) { throw "로컬 DB 시작 실패. $logPath 로그를 확인하세요." }
    Write-Host '로컬 DB를 시작했습니다.'
} else {
    if (-not $running) { Write-Host '로컬 DB가 이미 중지되어 있습니다.'; exit 0 }
    & $pgCtl -D $dataPath -m fast -w stop
    if ($LASTEXITCODE -ne 0) { throw '로컬 DB 종료 실패' }
}
