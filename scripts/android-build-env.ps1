$ErrorActionPreference = 'Stop'
$androidProjectRoot = Split-Path -Parent $PSScriptRoot
$androidLocalRoot = Join-Path $androidProjectRoot '.local'
$jdkDirectories = @(Get-ChildItem -LiteralPath (Join-Path $androidLocalRoot 'android-build/jdk') -Directory)
if ($jdkDirectories.Count -ne 1) { throw 'Expected one portable JDK in .local/android-build/jdk.' }
$env:JAVA_HOME = $jdkDirectories[0].FullName
$env:ANDROID_HOME = Join-Path $androidLocalRoot 'android-build/sdk'
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:ANDROID_USER_HOME = Join-Path $androidLocalRoot 'android-user'
$env:GRADLE_USER_HOME = Join-Path $androidLocalRoot 'gradle'
$env:TEMP = Join-Path $androidLocalRoot 'temp'
$env:TMP = $env:TEMP
$env:APPDATA = Join-Path $androidLocalRoot 'appdata'
$env:LOCALAPPDATA = Join-Path $androidLocalRoot 'localappdata'
$javaUserDirectory = Join-Path $androidLocalRoot 'java-user'
foreach ($directory in @($env:ANDROID_USER_HOME, $env:GRADLE_USER_HOME, $env:TEMP, $env:APPDATA, $env:LOCALAPPDATA, $javaUserDirectory)) { New-Item -ItemType Directory -Force -Path $directory | Out-Null }
$env:JAVA_TOOL_OPTIONS = "-Duser.home=$javaUserDirectory -Djava.io.tmpdir=$($env:TEMP)"
$env:Path = "$($env:JAVA_HOME)\bin;$($env:ANDROID_HOME)\platform-tools;$env:Path"
