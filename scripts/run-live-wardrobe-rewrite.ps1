param(
  [string]$ChromePath = "$env:LOCALAPPDATA\AutoListerDomCanary\ChromeForTesting\chrome-win64\chrome.exe",
  [string]$SessionFile = "\\wsl.localhost\Ubuntu\tmp\autolister-live-session.json",
  [string]$VintedOrigin = "https://www.vinted.fr"
)

$ErrorActionPreference = "Stop"

$repoPath = Split-Path $PSScriptRoot -Parent
$script = Join-Path $PSScriptRoot "run-live-wardrobe-rewrite.mjs"
$tempRoot = Join-Path $env:TEMP ("AutoListerWardrobeExtension-" + [guid]::NewGuid().ToString("N"))
$testUserData = Join-Path $tempRoot "ChromeUserData"
$extensionDir = Join-Path $tempRoot "Extension"
$exitCode = 1

try {
  New-Item -ItemType Directory -Path $extensionDir -Force | Out-Null
  if (-not (Test-Path -LiteralPath $ChromePath)) { throw "Chrome for Testing not found: $ChromePath" }
  if (-not (Test-Path -LiteralPath $SessionFile)) { throw "Live test session not found: $SessionFile" }
  robocopy $repoPath $extensionDir /MIR /XD .git node_modules coverage docs test tests tmp /XF .env .env.local /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
  if ($LASTEXITCODE -ge 8) { exit $LASTEXITCODE }

  $env:AUTOLISTER_LIVE_USER_DATA = $testUserData
  $env:AUTOLISTER_LIVE_PROFILE = "Default"
  $env:AUTOLISTER_LIVE_EXTENSION = $extensionDir
  $env:DOM_CANARY_BROWSER_EXECUTABLE = $ChromePath
  $env:AUTOLISTER_LIVE_SESSION_FILE = $SessionFile
  $env:AUTOLISTER_LIVE_SYNTHETIC_OWNER = "1"
  $env:AUTOLISTER_LIVE_VINTED_ORIGIN = $VintedOrigin

  node $script
  $exitCode = $LASTEXITCODE
} finally {
  if (Test-Path $tempRoot) { Remove-Item $tempRoot -Recurse -Force }
}

exit $exitCode
