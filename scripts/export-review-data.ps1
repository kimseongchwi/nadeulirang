param()

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$outputDirectory = Join-Path $projectRoot '.local/review'
$outputFile = Join-Path $outputDirectory 'public-import.sql'
$psql = Join-Path $projectRoot '.local/postgresql/pgsql/bin/psql.exe'
. (Join-Path $PSScriptRoot 'local-settings.ps1')
$settings = Get-NadeulirangLocalSettings -ProjectRoot $projectRoot
$databaseUri = [Uri]($settings['DB_URL'] -replace '^jdbc:', '')
if ($databaseUri.Host -notin @('localhost', '127.0.0.1', '::1')) {
    throw '기존 로컬 DB에서만 내보냅니다. 외부 DB 설정을 사용하지 마세요.'
}
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
if (Test-Path -LiteralPath $outputFile) {
    throw '.local/review/public-import.sql이 이미 있습니다. 기존 검토본을 별도로 보존한 뒤 실행하세요.'
}
$previousPassword = $env:PGPASSWORD
$previousEncoding = $env:PGCLIENTENCODING
try {
    $env:PGPASSWORD = $settings['DB_PASSWORD']
    $env:PGCLIENTENCODING = 'UTF8'
    & $psql -X -q -A -t -h $databaseUri.Host -p $databaseUri.Port `
        -U $settings['DB_USERNAME'] -d $databaseUri.AbsolutePath.TrimStart('/') `
        -v ON_ERROR_STOP=1 -f (Join-Path $PSScriptRoot 'export-review-data.sql') -o $outputFile
    if ($LASTEXITCODE -ne 0) { throw '공개 자료 내보내기 실패. 생성된 파일은 이관에 사용하지 마세요.' }
    Write-Host '공개 후보 최대 100건의 검토용 SQL을 .local/review/public-import.sql에 저장했습니다. 외부 이관은 수행하지 않았습니다.'
} finally {
    $env:PGPASSWORD = $previousPassword
    $env:PGCLIENTENCODING = $previousEncoding
}
