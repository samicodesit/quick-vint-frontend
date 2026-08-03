$ErrorActionPreference = "Stop"
$wrapper = Join-Path (Split-Path $PSScriptRoot -Parent) "scripts\run-real-browser.ps1"

$listing = & $wrapper -Check listing-create -Describe | ConvertFrom-Json
if ($listing.profileMode -ne "canary") { throw "listing-create profile mode" }
if (-not $listing.headless) { throw "listing-create should be headless" }
if ($listing.postResult -ne $false) { throw "manual check must not post alerts" }
if ($listing.profileDir -notlike "*AutoListerDomCanary*ChromeUserData") {
  throw "listing-create must use the dedicated profile"
}
if ($listing.profileDir -like "*Google*Chrome*User Data*") {
  throw "normal Chrome profile selected"
}

$wardrobe = & $wrapper -Check wardrobe-rewrite -Describe | ConvertFrom-Json
if ($wardrobe.profileMode -ne "disposable") { throw "wardrobe profile mode" }

$scheduled = & $wrapper -Check listing-create -PostResult -Describe | ConvertFrom-Json
if ($scheduled.postResult -ne $true) { throw "scheduled check must post its result" }

$setupRejected = $false
try {
  & $wrapper -Check wardrobe-rewrite -Setup -Describe
} catch {
  $setupRejected = $true
}
if (-not $setupRejected) { throw "wardrobe setup must be rejected" }

Write-Host "Real-browser wrapper contract passed"
