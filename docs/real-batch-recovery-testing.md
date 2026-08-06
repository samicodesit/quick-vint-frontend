# Real batch recovery test

This runs a real two-item batch on Vinted, restarts the unpacked extension after
the first item checkpoint, and verifies that the remaining item resumes. It uses
the dedicated `samicodesit+ai-style-test@gmail.com` account and never clicks Save
or Publish.

## Run

From WSL:

```sh
powershell.exe -NoProfile -ExecutionPolicy Bypass -File '\\wsl.localhost\Ubuntu\home\mests\projects\quick-vint\scripts\run-live-batch-recovery.ps1'
```

The first run opens a blank, persistent Chrome profile. Sign into the AutoLister
extension normally, sign into Vinted normally, and open
`https://www.vinted.nl/items/new`. Later runs reuse both logins from
`%LOCALAPPDATA%\AutoListerRealBatchTest`.

The runner does not copy another Chrome profile, cookies, or auth sessions and
does not inject authentication. If either login expires, complete the normal
sign-in again in the test browser.

Each run gives only its copied unpacked extension a higher fourth version
component (for example `1.4.3.7`) for unambiguous test diagnostics. It clears
only the dedicated profile's disposable service-worker script cache and binds
to the newly started worker; cookies and extension local storage remain
untouched.

The run consumes two test-account credits. Production pins this dedicated test
account to `gpt-5.4-mini`; normal customer generations keep the production model.

Structured results are written to
`/tmp/autolister-real-batch-result.json`. A passing result has `"ok": true`, a
nonzero recovery prompt delay, `"1/2 ready"` before resume, two complete work
tabs, `"automaticNudge": true`, `"returnedToController": true`, and
`"saveOrPublishClicks": 0`.

Do not automate CAPTCHA or click Vinted Save/Publish.
