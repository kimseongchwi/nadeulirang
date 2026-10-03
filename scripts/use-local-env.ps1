# 현재 PowerShell 세션에만 프로젝트 전용 JDK·PostgreSQL 경로를 적용한다.
$projectRoot = Split-Path -Parent $PSScriptRoot
$javaRoot = Join-Path $projectRoot '.local/java'
$jdk = @(Get-ChildItem -LiteralPath $javaRoot -Directory -Filter 'jdk-21*' -ErrorAction SilentlyContinue)
if ($jdk.Count -ne 1 -or -not (Test-Path (Join-Path $jdk[0].FullName 'bin/javac.exe'))) {
    throw '.local/java에 JDK 21 배포본을 하나 준비하세요. README의 백엔드 개발 환경을 참고하세요.'
}

$env:JAVA_HOME = $jdk[0].FullName
$javaBin = Join-Path $env:JAVA_HOME 'bin'
$pgBin = Join-Path $projectRoot '.local/postgresql/pgsql/bin'
$localBins = @($javaBin)
if (Test-Path (Join-Path $pgBin 'psql.exe')) { $localBins += $pgBin }
$remainingPaths = @($env:Path -split ';' | Where-Object { $_ -and $_ -notin $localBins })
$env:Path = ($localBins + $remainingPaths) -join ';'

# API 키를 환경 변수로 전달하지 않는다. 허용한 DB 값만 실행 없이 전달한다.
$envFile = Join-Path $projectRoot '.env'
if (Test-Path -LiteralPath $envFile) {
    foreach ($line in [System.IO.File]::ReadAllLines($envFile)) {
        if ($line -match '^\s*(DB_URL|DB_USERNAME|DB_PASSWORD)=(.*)$') {
            [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2].Trim(), 'Process')
        }
    }
}
Write-Host '현재 세션에 로컬 JDK·PostgreSQL 경로와 DB 설정을 적용했습니다.'
