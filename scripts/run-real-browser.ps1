param(
  [Parameter(Mandatory = $true)]
  [string]$Check,
  [switch]$Setup,
  [switch]$PostResult,
  [switch]$Describe,
  [string]$ChromePath = "",
  [string]$SessionFile = "\\wsl.localhost\Ubuntu\tmp\autolister-live-session.json",
  [string]$VintedOrigin = "https://www.vinted.nl",
  [string]$CanaryRoot = "$env:LOCALAPPDATA\AutoListerDomCanary",
  [string]$EnvFile = "\\wsl.localhost\Ubuntu\home\mests\projects\autolister\.env.local"
)

$ErrorActionPreference = "Stop"
$repoPath = Split-Path $PSScriptRoot -Parent
$dispatcher = Join-Path $PSScriptRoot "run-real-browser.mjs"
$definitionJson = node $dispatcher $Check --describe
if ($LASTEXITCODE -ne 0) { throw "Unknown real-browser check: $Check" }
$definition = $definitionJson | ConvertFrom-Json
$profileMode = $definition.profileMode
$tempRoot = Join-Path $env:TEMP ("AutoListerRealBrowser-" + [guid]::NewGuid().ToString("N"))
$profileDir = if ($profileMode -eq "canary") {
  Join-Path $CanaryRoot "ChromeUserData"
} else {
  Join-Path $tempRoot "ChromeUserData"
}

if ($Setup -and $profileMode -ne "canary") {
  throw "Setup is only available for the listing-create canary profile."
}

if ($Describe) {
  [pscustomobject]@{
    check = $Check
    profileMode = $profileMode
    profileDir = $profileDir
    headless = -not $Setup
    postResult = [bool]$PostResult
  } | ConvertTo-Json -Compress
  exit 0
}

function Get-ChromeForTestingPath {
  param([string]$Root, [string]$ExplicitChromePath)

  if ($ExplicitChromePath) {
    if (-not (Test-Path -LiteralPath $ExplicitChromePath)) {
      throw "ChromePath was not found: $ExplicitChromePath"
    }
    return $ExplicitChromePath
  }

  $chromeExe = Join-Path $Root "ChromeForTesting\chrome-win64\chrome.exe"
  if (Test-Path -LiteralPath $chromeExe) { return $chromeExe }

  $chromeRoot = Split-Path (Split-Path $chromeExe -Parent) -Parent
  New-Item -ItemType Directory -Force -Path $chromeRoot | Out-Null
  $metadata = Invoke-RestMethod "https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json"
  $download = $metadata.channels.Stable.downloads.chrome |
    Where-Object { $_.platform -eq "win64" } |
    Select-Object -First 1
  if (-not $download.url) { throw "Chrome for Testing win64 download URL was not found." }

  $zipPath = Join-Path $chromeRoot "chrome-for-testing-win64.zip"
  Invoke-WebRequest -UseBasicParsing -Uri $download.url -OutFile $zipPath
  Expand-Archive -Force -LiteralPath $zipPath -DestinationPath $chromeRoot
  Remove-Item -Force -LiteralPath $zipPath
  if (-not (Test-Path -LiteralPath $chromeExe)) {
    throw "Chrome for Testing did not install correctly: $chromeExe"
  }
  return $chromeExe
}

function Import-EnvFile {
  param([string]$Path)

  if (-not $Path -or -not (Test-Path -LiteralPath $Path)) { return }
  Get-Content -LiteralPath $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    if ($line -match '^([^=]+)=(.*)$') {
      $key = $matches[1].Trim()
      $value = $matches[2].Trim()
      if (
        ($value.StartsWith('"') -and $value.EndsWith('"')) -or
        ($value.StartsWith("'") -and $value.EndsWith("'"))
      ) {
        $value = $value.Substring(1, $value.Length - 2)
      }
      [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
  }
}

$extensionDir = Join-Path $tempRoot "Extension"
$exitCode = 1

try {
  if ($definition.requiresSession -and -not (Test-Path -LiteralPath $SessionFile)) {
    throw "Live test session not found: $SessionFile"
  }

  Import-EnvFile -Path $EnvFile
  $resolvedChromePath = Get-ChromeForTestingPath -Root $CanaryRoot -ExplicitChromePath $ChromePath
  New-Item -ItemType Directory -Force -Path $extensionDir, $profileDir | Out-Null
  robocopy $repoPath $extensionDir /MIR /XD .git node_modules coverage docs test tests tmp /XF .env .env.local ".env.*" /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "Extension copy failed with exit code $LASTEXITCODE." }

  $env:DOM_CANARY_PROFILE_DIR = $profileDir
  $env:DOM_CANARY_EXTENSION_PATH = $extensionDir
  $env:DOM_CANARY_BROWSER_EXECUTABLE = $resolvedChromePath
  $env:DOM_CANARY_URL = "$($VintedOrigin.TrimEnd('/'))/items/new"
  $env:AUTOLISTER_LIVE_USER_DATA = $profileDir
  $env:AUTOLISTER_LIVE_EXTENSION = $extensionDir
  $env:AUTOLISTER_LIVE_SESSION_FILE = $SessionFile
  $env:AUTOLISTER_LIVE_VINTED_ORIGIN = $VintedOrigin.TrimEnd('/')
  $env:AUTOLISTER_LIVE_OUTPUT_DIR = Join-Path $repoPath "tmp\real-browser\$Check"

  if ($Setup) {
    $env:DOM_CANARY_HEADED = "1"
    $env:DOM_CANARY_KEEP_OPEN_MS = "600000"
  } else {
    Remove-Item Env:\DOM_CANARY_HEADED -ErrorAction SilentlyContinue
    Remove-Item Env:\DOM_CANARY_KEEP_OPEN_MS -ErrorAction SilentlyContinue
  }
  if ($PostResult -and -not $Setup) {
    Remove-Item Env:\DOM_CANARY_NO_POST -ErrorAction SilentlyContinue
  } else {
    $env:DOM_CANARY_NO_POST = "1"
  }

  node $dispatcher $Check
  $exitCode = $LASTEXITCODE
} finally {
  if (Test-Path -LiteralPath $tempRoot) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force
  }
}

exit $exitCode
