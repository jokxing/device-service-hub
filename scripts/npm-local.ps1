param([Parameter(ValueFromRemainingArguments = $true)][string[]]$NpmArgs)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$localRoot = Join-Path $projectRoot '.local'
foreach ($folder in @('temp', 'appdata', 'localappdata', 'npm-cache', 'npm-global')) {
    New-Item -ItemType Directory -Path (Join-Path $localRoot $folder) -Force | Out-Null
}
$env:TEMP = Join-Path $localRoot 'temp'
$env:TMP = $env:TEMP
$env:APPDATA = Join-Path $localRoot 'appdata'
$env:LOCALAPPDATA = Join-Path $localRoot 'localappdata'
$env:npm_config_cache = Join-Path $localRoot 'npm-cache'
$env:npm_config_prefix = Join-Path $localRoot 'npm-global'
$env:npm_config_userconfig = Join-Path $localRoot 'user.npmrc'
$env:npm_config_globalconfig = Join-Path $localRoot 'global.npmrc'
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $localRoot 'browsers'
$env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1'
$env:NEXT_TELEMETRY_DISABLED = '1'
Set-Location -LiteralPath $projectRoot
& 'E:\nodejs\npm.cmd' @NpmArgs
exit $LASTEXITCODE
