# 현재 설정을 작업 폴더 밖에 보관한다. 값은 출력하지 않고 사용자·SYSTEM만 접근하도록 한다.
$ErrorActionPreference = 'Stop'
if ($env:OS -ne 'Windows_NT') { throw '이 저장 스크립트는 Windows용입니다. 다른 환경은 README의 공통 설정 안내를 따르세요.' }
$projectRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'local-settings.ps1')
$settings = Get-NadeulirangLocalSettings -ProjectRoot $projectRoot
$names = @('TOURAPI_SERVICE_KEY', 'FESTIVAL_SERVICE_KEY', 'MUSEUM_SERVICE_KEY', 'DB_URL', 'DB_USERNAME', 'DB_PASSWORD')
if (@($names | Where-Object { -not $settings.ContainsKey($_) }).Count) {
    throw '저장할 API 키 3개와 DB 설정 3개를 모두 준비하세요. 기존 공통 파일은 바꾸지 않았습니다.'
}
$sharedDirectory = Join-Path $env:USERPROFILE '.nadeulirang'
$sharedFile = Join-Path $sharedDirectory '.env'
$null = New-Item -ItemType Directory -Path $sharedDirectory -Force
$access = Get-Acl -LiteralPath $sharedDirectory
$userSid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
# icacls는 감사·소유자 설정을 함께 기록하지 않고 파일 접근 권한만 갱신한다.
& icacls.exe $sharedDirectory /inheritance:r /grant:r ('*' + $userSid.Value + ':(OI)(CI)F') '*S-1-5-18:(OI)(CI)F' | Out-Null
if ($LASTEXITCODE -ne 0) { throw '공통 설정 폴더의 접근 권한을 제한하지 못했습니다.' }
foreach ($rule in @($access.GetAccessRules($true, $false, [System.Security.Principal.SecurityIdentifier]))) {
    if ($rule.IdentityReference.Value -notin @($userSid.Value, 'S-1-5-18')) {
        & icacls.exe $sharedDirectory /remove ('*' + $rule.IdentityReference.Value) | Out-Null
        if ($LASTEXITCODE -ne 0) { throw '공통 설정 폴더의 기존 접근 권한을 정리하지 못했습니다.' }
    }
}
$temporaryFile = Join-Path $sharedDirectory ('.env.pending-' + [guid]::NewGuid().ToString('N'))
try {
    $lines = @('# 나들이랑 공통 로컬 설정: 실제 비밀값을 저장하며 Git으로 관리하지 않는다.')
    foreach ($name in $names) {
        $value = $settings[$name]
        if ($value.Contains("`r") -or $value.Contains("`n")) { throw '설정 값은 한 줄로 입력하세요.' }
        $lines += $name + '="' + $value + '"'
    }
    [System.IO.File]::WriteAllLines($temporaryFile, $lines, (New-Object System.Text.UTF8Encoding $false))
    if (Test-Path -LiteralPath $sharedFile) { [System.IO.File]::Replace($temporaryFile, $sharedFile, [System.Management.Automation.Language.NullString]::Value) }
    else { [System.IO.File]::Move($temporaryFile, $sharedFile) }
    # 기존 파일을 교체한 경우에도 폴더의 제한된 권한을 상속하도록 한다.
    & icacls.exe $sharedFile /reset | Out-Null
    if ($LASTEXITCODE -ne 0) { throw '공통 설정 파일의 접근 권한을 제한하지 못했습니다.' }
    Write-Host 'API 키·DB 설정 6개를 사용자 홈의 .nadeulirang/.env에 보관했습니다. 값은 출력하지 않았습니다.'
} finally {
    if (Test-Path -LiteralPath $temporaryFile) { Remove-Item -LiteralPath $temporaryFile }
}
