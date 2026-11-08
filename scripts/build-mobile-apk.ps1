$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\android-build-env.ps1"
Set-Location -LiteralPath $androidProjectRoot
$endpointFile = Join-Path $androidLocalRoot 'remote-mobile/endpoint.json'
$endpointConfig = Get-Content -LiteralPath $endpointFile | ConvertFrom-Json
$remoteAccountConfig = Get-Content -LiteralPath (Join-Path $androidLocalRoot 'remote-mobile/accounts.json') | ConvertFrom-Json
if ([DateTimeOffset]::Parse($remoteAccountConfig.expiresAt) -le [DateTimeOffset]::UtcNow) { throw 'Remote test window expired; refusing to build an unusable APK.' }
$endpointUri = [Uri]$endpointConfig.apiUrl
if ($endpointUri.Scheme -ne 'https' -or $endpointUri.Host -notmatch '^[a-z0-9-]+\.trycloudflare\.com$' -or $endpointUri.AbsolutePath -ne '/api' -or $endpointUri.UserInfo -or $endpointUri.Query -or $endpointUri.Fragment) { throw 'Expected the verified temporary HTTPS mobile API endpoint.' }
$env:EXPO_PUBLIC_API_URL = $endpointConfig.apiUrl
$env:DSH_ANDROID_LOCAL_APK = '1'
$env:NODE_ENV = 'production'
$env:EXPO_NO_TELEMETRY = '1'
$env:CMAKE_BUILD_PARALLEL_LEVEL = '2'
$signingDirectory = Join-Path $androidLocalRoot 'android-build/signing'
New-Item -ItemType Directory -Force -Path $signingDirectory | Out-Null
$keyConfigPath = Join-Path $signingDirectory 'key.json'
$env:DSH_APK_KEYSTORE = Join-Path $signingDirectory 'device-service-hub-test.jks'
if (!(Test-Path -LiteralPath $keyConfigPath)) {
  if (Test-Path -LiteralPath $env:DSH_APK_KEYSTORE) { throw 'Existing key without password config; refusing to overwrite.' }
  $randomBytes = New-Object byte[] 32
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($randomBytes)
  @{ password = [Convert]::ToBase64String($randomBytes) } | ConvertTo-Json | Set-Content -LiteralPath $keyConfigPath
}
$keyConfig = Get-Content -LiteralPath $keyConfigPath | ConvertFrom-Json
$env:DSH_APK_KEY_PASSWORD = $keyConfig.password
try {
  if (!(Test-Path -LiteralPath $env:DSH_APK_KEYSTORE)) {
    & "$env:JAVA_HOME\bin\keytool.exe" -genkeypair -keystore $env:DSH_APK_KEYSTORE -storepass:env DSH_APK_KEY_PASSWORD -keypass:env DSH_APK_KEY_PASSWORD -alias device-service-hub-test -keyalg RSA -keysize 2048 -validity 3650 -dname 'CN=Device Service Hub Local Test'
    if ($LASTEXITCODE -ne 0) { throw 'Could not create local signing key.' }
  }
  & "$PSScriptRoot\npm-local.ps1" run prebuild:mobile:android
  if ($LASTEXITCODE -ne 0) { throw 'Android prebuild failed.' }
  $androidDirectory = Join-Path $androidProjectRoot 'apps/mobile/android'
  $sdkPath = $env:ANDROID_HOME.Replace('\', '/')
  "sdk.dir=$sdkPath" | Set-Content -LiteralPath (Join-Path $androidDirectory 'local.properties')
  # Ninja 1.10.2 cannot re-stat some recorded RN headers over MAX_PATH.
  # Only discard generated dependency logs; do not alter registry or source files.
  $nativeCacheRoots = @('apps/mobile/android/app/.cxx', 'node_modules/react-native-screens/android/.cxx', 'node_modules/react-native-worklets/android/.cxx', 'node_modules/react-native-reanimated/android/.cxx', 'node_modules/expo-modules-core/android/.cxx')
  $verifiedWorkspace = [IO.Path]::GetFullPath($androidProjectRoot) + [IO.Path]::DirectorySeparatorChar
  foreach ($cacheRoot in $nativeCacheRoots) {
    $cacheDirectory = Join-Path $androidProjectRoot $cacheRoot
    if (!(Test-Path -LiteralPath $cacheDirectory)) { continue }
    foreach ($dependencyLog in (Get-ChildItem -LiteralPath $cacheDirectory -Recurse -File -Force -Filter '.ninja_deps')) {
      $verifiedLog = [IO.Path]::GetFullPath($dependencyLog.FullName)
      if (!$verifiedLog.StartsWith($verifiedWorkspace, [StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetFileName($verifiedLog) -ne '.ninja_deps') { throw 'Unexpected native cache target.' }
      Remove-Item -LiteralPath $verifiedLog
    }
  }
  Push-Location -LiteralPath $androidDirectory
  try {
    $wrapperProperties = Get-Content -LiteralPath (Join-Path $androidDirectory 'gradle/wrapper/gradle-wrapper.properties') -Raw
    if ($wrapperProperties -notmatch 'gradle-([0-9.]+)-bin.zip') { throw 'Cannot determine generated Gradle version.' }
    $portableGradle = Join-Path $androidLocalRoot "android-build/gradle/gradle-$($Matches[1])/bin/gradle.bat"
    if (!(Test-Path -LiteralPath $portableGradle)) { throw 'The matching verified portable Gradle distribution is missing.' }
    & $portableGradle :app:assembleRelease --no-daemon --info --console=plain --max-workers=2 '-PreactNativeArchitectures=arm64-v8a,x86_64' '-Dorg.gradle.vfs.watch=false'
    if ($LASTEXITCODE -ne 0) { throw 'APK compilation failed; no successful artifact reported.' }
  } finally { Pop-Location }
  $artifact = Join-Path $androidDirectory 'app/build/outputs/apk/release/app-release.apk'
  $outputDirectory = Join-Path $androidLocalRoot 'artifacts/android'
  New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
  $output = Join-Path $outputDirectory 'device-service-hub-0.1.0-test.apk'
  Copy-Item -LiteralPath $artifact -Destination $output
  $apkStream = [IO.File]::OpenRead($output)
  try { $checksum = -join ([Security.Cryptography.SHA256]::Create().ComputeHash($apkStream) | ForEach-Object { $_.ToString('x2') }) } finally { $apkStream.Dispose() }
  @{ apk = $output; sha256 = $checksum; apiUrl = $endpointConfig.apiUrl; builtAt = [DateTime]::UtcNow.ToString('o'); architectures = @('arm64-v8a', 'x86_64'); signing = 'local-test'; metroRequired = $false } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $outputDirectory 'build-info.json')
  Write-Output "APK ready: $output"
  Write-Output "SHA256: $checksum"
} finally { Remove-Item Env:DSH_APK_KEY_PASSWORD -ErrorAction SilentlyContinue }
