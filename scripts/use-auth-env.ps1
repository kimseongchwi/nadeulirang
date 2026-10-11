# 인증 설정은 작업 폴더 .env에서 현재 프로세스에만 적용한다. 공통 홈 설정은 읽거나 변경하지 않는다.
$authRoot = Split-Path -Parent $PSScriptRoot
$authFile = Join-Path $authRoot '.env'
$authNames = @('AUTH_PUBLIC_ORIGIN', 'AUTH_SECURE_COOKIE', 'AUTH_TERMS_VERSION', 'AUTH_PRIVACY_VERSION',
    'AUTH_MAIL_FROM', 'AUTH_SMTP_HOST', 'AUTH_SMTP_PORT', 'AUTH_SMTP_USERNAME', 'AUTH_SMTP_PASSWORD',
    'KAKAO_CLIENT_ID', 'KAKAO_CLIENT_SECRET', 'NAVER_CLIENT_ID', 'NAVER_CLIENT_SECRET')
if (Test-Path -LiteralPath $authFile -PathType Leaf) {
    foreach ($authLine in [System.IO.File]::ReadAllLines($authFile)) {
        if ($authLine -notmatch '^\s*([A-Z_]+)\s*=(.*)$' -or $Matches[1] -notin $authNames) { continue }
        $authName = $Matches[1]
        $authValue = $Matches[2].Trim()
        if ($authValue.Length -ge 2 -and ($authValue[0] -eq '"' -or $authValue[0] -eq "'") -and $authValue[$authValue.Length - 1] -eq $authValue[0]) {
            $authValue = $authValue.Substring(1, $authValue.Length - 2)
        }
        if (-not [string]::IsNullOrWhiteSpace($authValue)) { [Environment]::SetEnvironmentVariable($authName, $authValue, 'Process') }
    }
}
