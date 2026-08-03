$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent
$installer = Join-Path $repoRoot "scripts\install-dom-canary-task.ps1"
$tempRoot = Join-Path $env:TEMP ("AutoListerCanaryInstallerTest-" + [guid]::NewGuid().ToString("N"))
$fakeRepo = Join-Path $tempRoot "Repo"
$fakeScripts = Join-Path $fakeRepo "scripts"
$canaryRoot = Join-Path $tempRoot "Canary"
$envFile = Join-Path $tempRoot ".env.local"
$capturePath = Join-Path $tempRoot "capture.json"

try {
  New-Item -ItemType Directory -Force -Path $fakeScripts | Out-Null
  Set-Content -LiteralPath $envFile -Value "DOM_CANARY_SECRET=test" -Encoding UTF8
  $fakeWrapper = @'
param(
  [string]$Check,
  [string]$CanaryRoot,
  [string]$EnvFile,
  [string]$VintedOrigin
)
[pscustomobject]@{
  Check = $Check
  CanaryRoot = $CanaryRoot
  EnvFile = $EnvFile
  VintedOrigin = $VintedOrigin
} | ConvertTo-Json -Compress | Set-Content -LiteralPath $env:AUTOLISTER_INSTALLER_CAPTURE -Encoding UTF8
exit 7
'@
  Set-Content -LiteralPath (Join-Path $fakeScripts "run-real-browser.ps1") -Value $fakeWrapper -Encoding UTF8

  & $installer `
    -RepoPath $fakeRepo `
    -EnvFile $envFile `
    -CanaryRoot $canaryRoot `
    -VintedUrl "https://www.vinted.nl/items/new" `
    -NoRegister

  $env:AUTOLISTER_INSTALLER_CAPTURE = $capturePath
  & (Join-Path $canaryRoot "run-dom-canary.ps1")
  if ($LASTEXITCODE -ne 7) { throw "scheduled runner hid child failure" }

  $capture = Get-Content -Raw -LiteralPath $capturePath | ConvertFrom-Json
  if ($capture.Check -ne "listing-create") { throw "wrong daily check" }
  if ($capture.CanaryRoot -ne $canaryRoot) { throw "wrong dedicated root" }
  if ($capture.VintedOrigin -ne "https://www.vinted.nl") { throw "wrong Vinted origin" }
} finally {
  Remove-Item Env:\AUTOLISTER_INSTALLER_CAPTURE -ErrorAction SilentlyContinue
  if (Test-Path -LiteralPath $tempRoot) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force
  }
}

Write-Host "DOM canary installer contract passed"
