param(
  [string]$TaskName = "AutoLister DOM Canary",
  [string]$RepoPath = "\\wsl.localhost\Ubuntu\home\mests\projects\quick-vint",
  [string]$EnvFile = "\\wsl.localhost\Ubuntu\home\mests\projects\autolister\.env.local",
  [string]$CanaryRoot = "$env:LOCALAPPDATA\AutoListerDomCanary",
  [string]$ProfileDirectory = "Default",
  [string]$ChromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe",
  [int]$IntervalHours = 24,
  [switch]$AllowFailingPreflight
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ChromePath)) {
  $fallbackChromePath = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
  if (Test-Path -LiteralPath $fallbackChromePath) {
    $ChromePath = $fallbackChromePath
  } else {
    throw "Chrome was not found. Pass -ChromePath explicitly."
  }
}

$nodeScript = Join-Path $RepoPath "scripts\run-dom-canary.mjs"
$profileDir = Join-Path $CanaryRoot "ChromeUserData"
$extensionPath = Join-Path $CanaryRoot "Extension"
$runnerPath = Join-Path $CanaryRoot "run-dom-canary.ps1"

foreach ($path in @($RepoPath, $EnvFile, $nodeScript)) {
  if (-not (Test-Path -LiteralPath $path)) {
    throw "Required path not found: $path"
  }
}

New-Item -ItemType Directory -Force -Path $CanaryRoot, $profileDir, $extensionPath | Out-Null

$runner = @"
param([switch]`$NoPost)

`$ErrorActionPreference = "Stop"
`$envFile = '$($EnvFile.Replace("'", "''"))'
`$repoPath = '$($RepoPath.Replace("'", "''"))'
`$nodeScript = '$($nodeScript.Replace("'", "''"))'
`$profileDir = '$($profileDir.Replace("'", "''"))'
`$extensionPath = '$($extensionPath.Replace("'", "''"))'
`$chromePath = '$($ChromePath.Replace("'", "''"))'
`$profileDirectory = '$($ProfileDirectory.Replace("'", "''"))'

Get-Content -LiteralPath `$envFile | ForEach-Object {
  `$line = `$_.Trim()
  if (-not `$line -or `$line.StartsWith("#")) { return }
  if (`$line -match '^([^=]+)=(.*)$') {
    `$key = `$matches[1].Trim()
    `$value = `$matches[2].Trim()
    if ((`$value.StartsWith('"') -and `$value.EndsWith('"')) -or (`$value.StartsWith("'") -and `$value.EndsWith("'"))) {
      `$value = `$value.Substring(1, `$value.Length - 2)
    }
    [Environment]::SetEnvironmentVariable(`$key, `$value, 'Process')
  }
}

robocopy `$repoPath `$extensionPath /MIR /XD .git node_modules coverage test /XF .env .env.local /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
if (`$LASTEXITCODE -ge 8) {
  exit `$LASTEXITCODE
}

`$env:DOM_CANARY_PROFILE_DIR = `$profileDir
`$env:DOM_CANARY_EXTENSION_PATH = `$extensionPath
`$env:DOM_CANARY_BROWSER_EXECUTABLE = `$chromePath
`$env:DOM_CANARY_PROFILE_DIRECTORY = `$profileDirectory
`$env:DOM_CANARY_CHROME_CHANNEL = ""

if (`$NoPost) {
  `$env:DOM_CANARY_NO_POST = "1"
  Remove-Item Env:\DOM_CANARY_EXIT_ZERO_ON_REPORTED_FAILURE -ErrorAction SilentlyContinue
} else {
  Remove-Item Env:\DOM_CANARY_NO_POST -ErrorAction SilentlyContinue
  `$env:DOM_CANARY_EXIT_ZERO_ON_REPORTED_FAILURE = "1"
}

Set-Location -LiteralPath `$repoPath
node `$nodeScript
exit `$LASTEXITCODE
"@

Set-Content -LiteralPath $runnerPath -Value $runner -Encoding UTF8

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $runnerPath -NoPost
$preflightExitCode = $LASTEXITCODE
if ($preflightExitCode -ne 0 -and -not $AllowFailingPreflight) {
  throw "DOM canary preflight failed. Log in with npm run canary:dom:setup or rerun with -AllowFailingPreflight so auth failures are reported instead of heartbeat-missing alerts."
}

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runnerPath`""
$firstRun = (Get-Date).AddHours($IntervalHours)
$trigger = New-ScheduledTaskTrigger `
  -Once `
  -At $firstRun `
  -RepetitionInterval (New-TimeSpan -Hours $IntervalHours)
$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -WakeToRun `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 20)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "Runs the AutoLister Vinted DOM canary every $IntervalHours hours." `
  -Force | Out-Null

if ($preflightExitCode -eq 0) {
  Write-Host "Installed scheduled task: $TaskName"
} else {
  Write-Host "Installed scheduled task with failing preflight: $TaskName"
}
