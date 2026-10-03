function Get-NadeulirangLocalSettings {
    param(
        [Parameter(Mandatory = $true)][string]$ProjectRoot,
        [string]$SharedFile = (Join-Path $env:USERPROFILE '.nadeulirang/.env')
    )
    $settings = @{}
    foreach ($file in @($SharedFile, (Join-Path $ProjectRoot '.env'))) {
        if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { continue }
        foreach ($line in [System.IO.File]::ReadAllLines($file)) {
            if ($line -notmatch '^\s*(TOURAPI_SERVICE_KEY|FESTIVAL_SERVICE_KEY|MUSEUM_SERVICE_KEY|DB_URL|DB_USERNAME|DB_PASSWORD)\s*=(.*)$') { continue }
            $name = $Matches[1]
            $value = $Matches[2].Trim()
            if ($value.Length -ge 2 -and ($value[0] -eq '"' -or $value[0] -eq "'") -and $value[$value.Length - 1] -eq $value[0]) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            if (-not [string]::IsNullOrWhiteSpace($value)) { $settings[$name] = $value }
        }
    }
    return $settings
}
