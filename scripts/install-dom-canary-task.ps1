param(
  [string]$TaskName = "AutoLister DOM Canary",
  [string]$RepoPath = (Split-Path $PSScriptRoot -Parent),
  [Parameter(Mandatory = $true)][string]$ExtensionZip,
  [string]$EnvFile = "\\wsl.localhost\Ubuntu\home\mests\projects\autolister\.env.local",
  [string]$CanaryRoot = "$env:LOCALAPPDATA\AutoListerDomCanary",
  [string]$ProfileDirectory = "Default",
  [string]$ChromePath = "",
  [int]$IntervalHours = 24,
  [string]$VintedUrl = "https://www.vinted.nl/items/new"
)

$ErrorActionPreference = "Stop"
$CanaryRoot = [IO.Path]::GetFullPath($CanaryRoot).TrimEnd('\')
if ($CanaryRoot -eq [IO.Path]::GetPathRoot($CanaryRoot).TrimEnd('\')) {
  throw "CanaryRoot must be a dedicated directory"
}
if ((Test-Path -LiteralPath $CanaryRoot) -and ((Get-Item -LiteralPath $CanaryRoot).Attributes -band [IO.FileAttributes]::ReparsePoint)) {
  throw "CanaryRoot must not be a junction or symbolic link"
}
$profileDir = Join-Path $CanaryRoot "Chrome"
$extensionPath = Join-Path $CanaryRoot "Extension"
$runnerPath = Join-Path $CanaryRoot "run-dom-canary.ps1"
$nodeRunner = Join-Path $CanaryRoot "run-dom-canary.mjs"
$nodePath = (Get-Command node -ErrorAction Stop).Source
$npmPath = (Get-Command npm.cmd -ErrorAction Stop).Source
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing -and ($existing.Actions.Count -ne 1 -or $existing.Actions[0].Arguments -notlike "*$runnerPath*")) {
  throw "Existing task points to a different runner; inspect it before replacing"
}
if ($existing -and $existing.State -eq "Running") { throw "Canary task is running" }
if (Get-CimInstance Win32_Process | Where-Object {
  $_.Name -eq "chrome.exe" -and $_.CommandLine -like "*$profileDir*"
}) { throw "Close the dedicated canary browser before updating it" }
foreach ($required in @($ExtensionZip, $EnvFile, (Join-Path $RepoPath "scripts\run-dom-canary.mjs"))) {
  if (-not (Test-Path -LiteralPath $required)) { throw "Required path missing: $required" }
}

# Preserve the original profile. No cookie seeding, account creation, or secrets
# embedded in the extension/page. The host runner owns result delivery.
New-Item -ItemType Directory -Force -Path $CanaryRoot, $profileDir | Out-Null
if (-not $ChromePath) {
  $ChromePath = Join-Path $CanaryRoot "ChromeForTesting\chrome-win64\chrome.exe"
}
if (-not (Test-Path -LiteralPath $ChromePath)) {
  throw "Chrome for Testing is missing. Supply its installed path with -ChromePath."
}
$stage = Join-Path $CanaryRoot "extension-install"
if (Test-Path -LiteralPath $stage) { throw "Previous extension staging directory needs inspection: $stage" }
try {
  Expand-Archive -LiteralPath $ExtensionZip -DestinationPath $stage
  $manifest = Get-Content -Raw -LiteralPath (Join-Path $stage "manifest.json") | ConvertFrom-Json
  if ($manifest.manifest_version -ne 3 -or -not $manifest.version) { throw "Invalid extension package" }
  $config = Get-Content -Raw -LiteralPath (Join-Path $stage "canary-config.js")
  if ($config -notmatch 'enabled:\s*false') { throw "Use the unmodified release package with canary mode disabled" }
  # Fixed children of the resolved, dedicated canary root only.
  if ([IO.Path]::GetFullPath($extensionPath) -ne "$CanaryRoot\Extension") { throw "Unsafe extension target" }
  if (Test-Path -LiteralPath $extensionPath) {
    if ((Get-Item -LiteralPath $extensionPath).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Extension target must not be a link" }
    Remove-Item -LiteralPath $extensionPath -Recurse -Force
  }
  Move-Item -LiteralPath $stage -Destination $extensionPath
} finally {
  if (Test-Path -LiteralPath $stage) {
    if ([IO.Path]::GetFullPath($stage) -ne "$CanaryRoot\extension-install") { throw "Unsafe staging target" }
    Remove-Item -LiteralPath $stage -Recurse -Force
  }
}
Copy-Item -LiteralPath (Join-Path $RepoPath "scripts\run-dom-canary.mjs") -Destination $nodeRunner
$playwrightVersion = & $nodePath -e "const fs=require('node:fs');process.stdout.write(JSON.parse(fs.readFileSync(process.argv[1],'utf8')).packages['node_modules/@playwright/test'].version)" (Join-Path $RepoPath "package-lock.json")
if ($LASTEXITCODE -ne 0) { throw "Cannot read pinned Playwright version" }
if ($playwrightVersion -notmatch '^\d+\.\d+\.\d+$') { throw "Missing pinned Playwright version" }
$installedPackage = Join-Path $CanaryRoot "node_modules\@playwright\test\package.json"
$installedVersion = if (Test-Path -LiteralPath $installedPackage) {
  (Get-Content -Raw -LiteralPath $installedPackage | ConvertFrom-Json).version
} else { "" }
if ($installedVersion -ne $playwrightVersion) {
  Push-Location $CanaryRoot
  try {
    & $npmPath install --prefix $CanaryRoot --no-save --package-lock=false --ignore-scripts --no-audit --no-fund "@playwright/test@$playwrightVersion"
    if ($LASTEXITCODE -ne 0) { throw "Native Playwright installation failed" }
  } finally { Pop-Location }
}

function Quote-PS([string]$Value) { return "'" + $Value.Replace("'", "''") + "'" }
$runner = @"
param([switch]`$NoPost, [switch]`$Setup)
`$ErrorActionPreference = 'Stop'
`$log = $(Quote-PS (Join-Path $CanaryRoot 'last-run.log'))
Set-Content -LiteralPath `$log -Encoding Unicode -Value ('StartedUtc=' + [DateTime]::UtcNow.ToString('o'))
try {
  `$line = Get-Content -LiteralPath $(Quote-PS $EnvFile) | Where-Object { `$_ -match '^DOM_CANARY_SECRET=' } | Select-Object -First 1
  if (-not `$line) { throw 'DOM_CANARY_SECRET is missing' }
  `$env:DOM_CANARY_SECRET = (`$line -split '=',2)[1].Trim().Trim('"').Trim("'")
  `$env:DOM_CANARY_PROFILE_DIR = $(Quote-PS $profileDir)
  `$env:DOM_CANARY_PROFILE_DIRECTORY = $(Quote-PS $ProfileDirectory)
  `$env:DOM_CANARY_EXTENSION_PATH = $(Quote-PS $extensionPath)
  `$env:DOM_CANARY_BROWSER_EXECUTABLE = $(Quote-PS $ChromePath)
  `$env:DOM_CANARY_URL = $(Quote-PS $VintedUrl)
  `$env:DOM_CANARY_HEADED = '1'
  `$env:DOM_CANARY_NO_POST = if (`$NoPost -or `$Setup) { '1' } else { '0' }
  `$env:DOM_CANARY_KEEP_OPEN_MS = if (`$Setup) { '600000' } else { '0' }
  `$env:DOM_CANARY_RESULT_PATH = $(Quote-PS (Join-Path $CanaryRoot 'last-result.json'))
  & $(Quote-PS $nodePath) $(Quote-PS $nodeRunner) *>> `$log
  exit `$LASTEXITCODE
} catch {
  Add-Content -LiteralPath `$log -Encoding Unicode -Value ('Launcher failed: ' + `$_.Exception.Message)
  exit 1
}
"@
$parseTokens = $null; $parseErrors = $null
[Management.Automation.Language.Parser]::ParseInput($runner, [ref]$parseTokens, [ref]$parseErrors) | Out-Null
if ($parseErrors.Count) { throw "Generated launcher failed syntax validation" }
[IO.File]::WriteAllText($runnerPath, $runner, [Text.UTF8Encoding]::new($false))
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runnerPath`"" -WorkingDirectory $CanaryRoot
$trigger = if ($existing) { $existing.Triggers } else {
  New-ScheduledTaskTrigger -Once -At (Get-Date).AddHours($IntervalHours) -RepetitionInterval (New-TimeSpan -Hours $IntervalHours)
}
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -WakeToRun -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 5)
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description "Checks Vinted listing selectors using the dedicated profile and a verified extension package." -Force | Out-Null
Write-Host "Updated one scheduled task: $TaskName; extension $($manifest.version). Existing schedule and profile preserved."
