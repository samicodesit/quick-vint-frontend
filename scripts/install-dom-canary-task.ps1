param(
  [string]$TaskName = "AutoLister DOM Canary",
  [string]$RepoPath = "\\wsl.localhost\Ubuntu\home\mests\projects\quick-vint",
  [string]$EnvFile = "\\wsl.localhost\Ubuntu\home\mests\projects\autolister\.env.local",
  [string]$CanaryRoot = "$env:LOCALAPPDATA\AutoListerDomCanary",
  [string]$ProfileDirectory = "Default",
  [string]$SeedUserDataDir = "$env:LOCALAPPDATA\Google\Chrome\User Data",
  [string]$SeedProfileDirectory = "Default",
  [switch]$SkipProfileSeed,
  [string]$ChromePath = "",
  [string]$ChromeForTestingRoot = "$env:LOCALAPPDATA\AutoListerDomCanary\ChromeForTesting",
  [int]$IntervalHours = 24,
  [string]$VintedUrl = "https://www.vinted.nl/items/new"
)

$ErrorActionPreference = "Stop"

function Get-ChromeForTestingPath {
  param(
    [string]$Root,
    [string]$ExplicitChromePath
  )

  if ($ExplicitChromePath) {
    if (-not (Test-Path -LiteralPath $ExplicitChromePath)) {
      throw "ChromePath was not found: $ExplicitChromePath"
    }
    return $ExplicitChromePath
  }

  $chromeExe = Join-Path $Root "chrome-win64\chrome.exe"
  if (Test-Path -LiteralPath $chromeExe) {
    return $chromeExe
  }

  New-Item -ItemType Directory -Force -Path $Root | Out-Null
  $metadata = Invoke-RestMethod "https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json"
  $download = $metadata.channels.Stable.downloads.chrome |
    Where-Object { $_.platform -eq "win64" } |
    Select-Object -First 1
  if (-not $download.url) {
    throw "Chrome for Testing win64 download URL was not found."
  }

  $zipPath = Join-Path $Root "chrome-for-testing-win64.zip"
  Invoke-WebRequest -UseBasicParsing -Uri $download.url -OutFile $zipPath
  Expand-Archive -Force -LiteralPath $zipPath -DestinationPath $Root
  Remove-Item -Force -LiteralPath $zipPath

  if (-not (Test-Path -LiteralPath $chromeExe)) {
    throw "Chrome for Testing did not install correctly: $chromeExe"
  }
  return $chromeExe
}

$profileDir = Join-Path $CanaryRoot "ChromeUserData"
$extensionPath = Join-Path $CanaryRoot "Extension"
$runnerPath = Join-Path $CanaryRoot "run-dom-canary.ps1"
$accountPath = Join-Path $CanaryRoot "vinted-account.json"
$ResolvedChromePath = Get-ChromeForTestingPath -Root $ChromeForTestingRoot -ExplicitChromePath $ChromePath

foreach ($path in @($RepoPath, $EnvFile)) {
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
`$profileDir = '$($profileDir.Replace("'", "''"))'
`$extensionPath = '$($extensionPath.Replace("'", "''"))'
`$chromePath = '$($ResolvedChromePath.Replace("'", "''"))'
`$profileDirectory = '$($ProfileDirectory.Replace("'", "''"))'
`$seedUserDataDir = '$($SeedUserDataDir.Replace("'", "''"))'
`$seedProfileDirectory = '$($SeedProfileDirectory.Replace("'", "''"))'
`$skipProfileSeed = `$$($SkipProfileSeed.IsPresent.ToString().ToLowerInvariant())
`$accountPath = '$($accountPath.Replace("'", "''"))'
`$vintedUrl = '$($VintedUrl.Replace("'", "''"))'

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

Get-CimInstance Win32_Process |
  Where-Object { `$_.Name -eq "chrome.exe" -and `$_.CommandLine -like "*`$profileDir*" } |
  ForEach-Object { Stop-Process -Id `$_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 1

if (-not `$skipProfileSeed -and `$seedUserDataDir -and (Test-Path -LiteralPath `$seedUserDataDir)) {
  `$seedProfilePath = Join-Path `$seedUserDataDir `$seedProfileDirectory
  `$targetProfilePath = Join-Path `$profileDir `$profileDirectory
  if (Test-Path -LiteralPath `$seedProfilePath) {
    New-Item -ItemType Directory -Force -Path `$profileDir, `$targetProfilePath | Out-Null
    robocopy `$seedUserDataDir `$profileDir "Local State" /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
    if (`$LASTEXITCODE -ge 8) {
      exit `$LASTEXITCODE
    }
    robocopy `$seedProfilePath `$targetProfilePath /MIR /XD Cache "Code Cache" GPUCache /XF lockfile "LOCK*" "Singleton*" /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
    if (`$LASTEXITCODE -ge 8) {
      exit `$LASTEXITCODE
    }
  }
}

robocopy `$repoPath `$extensionPath /MIR /XD .git node_modules coverage test /XF .env .env.local /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
if (`$LASTEXITCODE -ge 8) {
  exit `$LASTEXITCODE
}

if (-not (Test-Path -LiteralPath `$accountPath)) {
  `$suffix = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds().ToString("x")
  [pscustomobject]@{
    email = "dom-canary-`$suffix@autolister.app"
    password = "AutoLister-`$suffix-Vinted!42"
    username = "autolister_`$suffix"
    mode = "signup"
  } | ConvertTo-Json | Set-Content -LiteralPath `$accountPath -Encoding UTF8
}

`$account = Get-Content -Raw -LiteralPath `$accountPath | ConvertFrom-Json
`$secret = [Environment]::GetEnvironmentVariable("DOM_CANARY_SECRET", "Process")
if (-not `$secret) {
  throw "DOM_CANARY_SECRET is missing from `$envFile"
}

`$mode = if (`$account.mode) { `$account.mode } else { "login" }
`$configJson = [pscustomobject]@{
  enabled = `$true
  secret = `$secret
  email = `$account.email
  password = `$account.password
  username = `$account.username
  mode = `$mode
} | ConvertTo-Json -Compress
`$config = "globalThis.QUICKVINT_DOM_CANARY = `$configJson;"
[System.IO.File]::WriteAllText((Join-Path `$extensionPath "canary-config.js"), `$config, [System.Text.UTF8Encoding]::new(`$false))

Start-Process -FilePath `$chromePath -ArgumentList @(
  "--user-data-dir=`$profileDir",
  "--profile-directory=`$profileDirectory",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-search-engine-choice-screen",
  "--disable-extensions-except=`$extensionPath",
  "--load-extension=`$extensionPath",
  "--new-window",
  `$vintedUrl
)
exit 0
"@

Set-Content -LiteralPath $runnerPath -Value $runner -Encoding UTF8

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

Write-Host "Installed scheduled task: $TaskName"
Write-Host "Runner: $runnerPath"
Write-Host "Account: $accountPath"
Write-Host "Browser: $ResolvedChromePath"
