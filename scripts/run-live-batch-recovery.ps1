param()

$ErrorActionPreference = "Stop"
$repoPath = "\\wsl.localhost\Ubuntu\home\mests\projects\quick-vint"
$scriptPath = Join-Path $repoPath "scripts\run-live-batch-recovery.mjs"
$chromePath = "$env:LOCALAPPDATA\AutoListerDomCanary\ChromeForTesting\chrome-win64\chrome.exe"
$sourceUserData = "$env:LOCALAPPDATA\Google\Chrome\User Data"
$profileDirectory = "Profile 4"
$testRoot = Join-Path $env:LOCALAPPDATA "AutoListerRealBatchTest"
$testUserData = Join-Path $testRoot "ChromeUserData"
$extensionDir = Join-Path $testRoot "Extension"
$outputFile = Join-Path $testRoot "result.json"
$finalOutputFile = "\\wsl.localhost\Ubuntu\tmp\autolister-real-batch-result.json"
$exitCode = 1

try {
  Remove-Item -LiteralPath $finalOutputFile -Force -ErrorAction SilentlyContinue
  Write-Output "Preparing isolated real-batch browser..."
  $profileExists = Test-Path -LiteralPath (Join-Path $testUserData "Local State")
  New-Item -ItemType Directory -Force -Path $testUserData, $extensionDir | Out-Null
  if (-not $profileExists) {
    Copy-Item -LiteralPath (Join-Path $sourceUserData "Local State") -Destination (Join-Path $testUserData "Local State") -Force
    robocopy (Join-Path $sourceUserData $profileDirectory) (Join-Path $testUserData $profileDirectory) /E /XJ /R:1 /W:1 /XD Cache "Code Cache" GPUCache DawnCache GrShaderCache ShaderCache /XF "Singleton*" "LOCK*" /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "Could not initialize the Chrome test profile (robocopy $LASTEXITCODE)." }
  }
  robocopy $repoPath $extensionDir /MIR /XD .git node_modules coverage docs test tests tmp /XF .env .env.local /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "Could not copy the extension (robocopy $LASTEXITCODE)." }
  $manifestPath = Join-Path $extensionDir "manifest.json"
  $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  $manifest.PSObject.Properties.Remove("key")
  [System.IO.File]::WriteAllText($manifestPath, ($manifest | ConvertTo-Json -Depth 100), [System.Text.UTF8Encoding]::new($false))

  $env:AUTOLISTER_REAL_BATCH_USER_DATA = $testUserData
  $env:AUTOLISTER_REAL_BATCH_EXTENSION = $extensionDir
  $env:AUTOLISTER_REAL_BATCH_BROWSER = $chromePath
  $env:AUTOLISTER_REAL_BATCH_PROFILE = $profileDirectory
  $env:AUTOLISTER_REAL_BATCH_OUTPUT = $outputFile
  $env:AUTOLISTER_REAL_BATCH_IMAGE_ONE = Join-Path $extensionDir "images\quickvint-upload-single.jpg"
  $env:AUTOLISTER_REAL_BATCH_IMAGE_TWO = Join-Path $extensionDir "images\quickvint-upload-multiple.jpg"
  $env:AUTOLISTER_REAL_BATCH_SESSION = "\\wsl.localhost\Ubuntu\tmp\autolister-live-session.json"
  $env:AUTOLISTER_REAL_BATCH_RECOVERY_ONLY = "1"

  Set-Location $env:TEMP
  Write-Output "Running real normal and recovery batches..."
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
