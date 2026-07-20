param(
  [string]$TaskName = "AutoLister DOM Canary",
  [string]$Distro = "",
  [string]$ProjectDir = "/home/mests/projects/autolister/quick-vint",
  [string]$EnvFile = "/home/mests/projects/autolister/.env.local"
)

$ErrorActionPreference = "Stop"

if (-not $Distro) {
  $Distro = (wsl.exe -l -q | Where-Object { $_.Trim() } | Select-Object -First 1).Trim()
}

if (-not $Distro) {
  throw "No WSL distro found. Pass -Distro explicitly."
}

$preflight = "set -a; . '$EnvFile'; set +a; cd '$ProjectDir'; npm run canary:dom:check"
wsl.exe -d $Distro -- bash -lc $preflight
if ($LASTEXITCODE -ne 0) {
  throw "DOM canary preflight failed. Run npm run canary:dom:setup and log in before installing the scheduled task."
}

$command = "set -a; . '$EnvFile'; set +a; cd '$ProjectDir'; npm run canary:dom"
$action = New-ScheduledTaskAction -Execute "wsl.exe" -Argument "-d $Distro -- bash -lc `"$command`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date -RepetitionInterval (New-TimeSpan -Hours 6)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun -ExecutionTimeLimit (New-TimeSpan -Minutes 20)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "Runs the AutoLister Vinted DOM canary every 6 hours." `
  -Force | Out-Null

Write-Host "Installed scheduled task: $TaskName"
