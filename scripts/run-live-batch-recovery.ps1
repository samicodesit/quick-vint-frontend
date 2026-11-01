param([switch]$ModelPhotosOnly)

$ErrorActionPreference = "Stop"
$repoPath = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path $repoPath "scripts\run-live-batch-recovery.mjs"
$chromePath = "$env:LOCALAPPDATA\AutoListerDomCanary\ChromeForTesting\chrome-win64\chrome.exe"
$testRoot = Join-Path $env:LOCALAPPDATA "AutoListerRealBatchTest"
$testUserData = Join-Path $testRoot "ChromeUserData"
$extensionDir = Join-Path $testRoot "Extension"
$extensionRevisionFile = Join-Path $testRoot "ExtensionRevision.txt"
$outputFile = Join-Path $testRoot "result.json"
$profileDirectory = if (Test-Path -LiteralPath (Join-Path $testUserData "Profile 4")) { "Profile 4" } else { "Default" }
$finalOutputFile = "\\wsl.localhost\Ubuntu\tmp\autolister-real-batch-result.json"
$exitCode = 1

try {
  Remove-Item -LiteralPath $finalOutputFile -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $outputFile -Force -ErrorAction SilentlyContinue
  Write-Output "Preparing isolated real-batch browser..."
  New-Item -ItemType Directory -Force -Path $testUserData, $extensionDir | Out-Null
  $workerScriptCache = Join-Path $testUserData "$profileDirectory\Service Worker\ScriptCache"
  foreach ($target in @($workerScriptCache, $extensionDir)) {
    $resolved = [System.IO.Path]::GetFullPath($target)
    if (-not $resolved.StartsWith([System.IO.Path]::GetFullPath($testRoot) + '\', [System.StringComparison]::OrdinalIgnoreCase)) { throw "Unsafe test target: $target" }
  }
  if (-not $ModelPhotosOnly) { Remove-Item -LiteralPath $workerScriptCache -Recurse -Force -ErrorAction SilentlyContinue }
  robocopy $repoPath $extensionDir /MIR /XD .git node_modules coverage docs test tests tmp /XF .env .env.local node_modules /XJ /R:1 /W:1 /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "Could not copy the extension (robocopy $LASTEXITCODE)." }
  if ($ModelPhotosOnly) {
    $contentPath = Join-Path $extensionDir "content.js"
    $content = [System.IO.File]::ReadAllText($contentPath)
    $needle = '  let listingPhotoController = null;'
    if (-not $content.Contains($needle)) { throw "Photo controller test entry point is missing." }
    $content = $content.Replace($needle, '  globalThis.__autolisterLivePhotoController = () => getListingPhotoController();' + "`n" + '  globalThis.__qaAddModelPhotosOnly = addModelPhotosOnly;' + "`n" + $needle)
    [System.IO.File]::WriteAllText($contentPath, $content, [System.Text.UTF8Encoding]::new($false))
  }
  $manifestPath = Join-Path $extensionDir "manifest.json"
  $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  if (-not $ModelPhotosOnly) { $manifest.PSObject.Properties.Remove("key") }
  $extensionRevision = if (Test-Path -LiteralPath $extensionRevisionFile) {
    1 + [int](Get-Content -LiteralPath $extensionRevisionFile -Raw)
  } else {
    1
  }
  if ($extensionRevision -gt 65535) { throw "Real-batch extension revision exceeded 65535." }
  $manifest.version = "$($manifest.version).$extensionRevision"
  [System.IO.File]::WriteAllText($extensionRevisionFile, "$extensionRevision", [System.Text.UTF8Encoding]::new($false))
  [System.IO.File]::WriteAllText($manifestPath, ($manifest | ConvertTo-Json -Depth 100), [System.Text.UTF8Encoding]::new($false))

  $env:AUTOLISTER_REAL_BATCH_USER_DATA = $testUserData
  $env:AUTOLISTER_REAL_BATCH_EXTENSION = $extensionDir
  $env:AUTOLISTER_REAL_BATCH_BROWSER = $chromePath
  $env:AUTOLISTER_REAL_BATCH_PROFILE = $profileDirectory
  $env:AUTOLISTER_REAL_BATCH_OUTPUT = $outputFile
  $env:AUTOLISTER_REAL_BATCH_IMAGE_ONE = Join-Path $extensionDir "images\quickvint-upload-single.jpg"
  $env:AUTOLISTER_REAL_BATCH_IMAGE_TWO = Join-Path $extensionDir "images\quickvint-upload-multiple.jpg"
  $env:AUTOLISTER_REAL_BATCH_RECOVERY_ONLY = "1"
  $env:AUTOLISTER_REAL_MODEL_PHOTOS_ONLY = if ($ModelPhotosOnly) { "1" } else { "0" }

  Set-Location $env:TEMP
  Write-Output $(if ($ModelPhotosOnly) { "Running real model-photo upload check..." } else { "Running real recovery batch..." })
  & "C:\Program Files\nodejs\node.exe" $scriptPath
  $exitCode = $LASTEXITCODE
} catch {
  Write-Error $_
  $exitCode = 1
} finally {
  if (Test-Path -LiteralPath $outputFile) {
    Copy-Item -LiteralPath $outputFile -Destination $finalOutputFile -Force
  }
  Get-CimInstance Win32_Process |
    Where-Object { $_.Name -eq "chrome.exe" -and $_.CommandLine -like "*$testUserData*" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Milliseconds 500
}

exit $exitCode
