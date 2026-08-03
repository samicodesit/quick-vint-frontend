param(
  [string]$TaskName = "AutoLister DOM Canary",
  [string]$RepoPath = "\\wsl.localhost\Ubuntu\home\mests\projects\quick-vint",
  [string]$EnvFile = "\\wsl.localhost\Ubuntu\home\mests\projects\autolister\.env.local",
  [string]$CanaryRoot = "$env:LOCALAPPDATA\AutoListerDomCanary",
  [int]$IntervalHours = 24,
  [string]$VintedUrl = "https://www.vinted.nl/items/new",
  [switch]$NoRegister
)

$ErrorActionPreference = "Stop"
$sharedWrapper = Join-Path $RepoPath "scripts\run-real-browser.ps1"
$runnerPath = Join-Path $CanaryRoot "run-dom-canary.ps1"
$vintedOrigin = ([uri]$VintedUrl).GetLeftPart([System.UriPartial]::Authority)

foreach ($path in @($RepoPath, $sharedWrapper, $EnvFile)) {
  if (-not (Test-Path -LiteralPath $path)) {
    throw "Required path not found: $path"
  }
}

New-Item -ItemType Directory -Force -Path $CanaryRoot | Out-Null
$runner = @"
`$ErrorActionPreference = "Stop"
`$sharedWrapper = '$($sharedWrapper.Replace("'", "''"))'
& `$sharedWrapper ``
  -Check listing-create ``
  -CanaryRoot '$($CanaryRoot.Replace("'", "''"))' ``
  -EnvFile '$($EnvFile.Replace("'", "''"))' ``
  -VintedOrigin '$($vintedOrigin.Replace("'", "''"))'
exit `$LASTEXITCODE
"@
[System.IO.File]::WriteAllText($runnerPath, $runner, [System.Text.UTF8Encoding]::new($false))

if ($NoRegister) {
  Write-Host "Prepared DOM canary runner: $runnerPath"
  return
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
  -Description "Runs the AutoLister headless Vinted listing canary every $IntervalHours hours." `
  -Force | Out-Null

$setupCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$sharedWrapper`" -Check listing-create -Setup -CanaryRoot `"$CanaryRoot`" -EnvFile `"$EnvFile`" -VintedOrigin `"$vintedOrigin`""
Write-Host "Installed scheduled task: $TaskName"
Write-Host "Runner: $runnerPath"
Write-Host "Dedicated-profile setup (only when auth expires):"
Write-Host $setupCommand
