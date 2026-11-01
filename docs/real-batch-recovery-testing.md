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

## Model-photo attachment subcase

Run the same launcher with `-ModelPhotosOnly` from the desired checkout. Set
`AUTOLISTER_MODEL_PHOTO_ORIGINAL`, `AUTOLISTER_MODEL_PHOTO_PRIMARY` and
`AUTOLISTER_MODEL_PHOTO_SECONDARY` to existing local JPEGs. Windows Node can
use `AUTOLISTER_PLAYWRIGHT_MODULE` for an installed Playwright package when a
WSL worktree's dependency symlink cannot be resolved by Windows.

This subcase uses the same persistent, manually authenticated profile. It
uploads an original, invokes the actual extension photo controller with a
cached pair, then uploads another original to force a real host-grid rerender.
It checks that the generated pair stays first. It never calls an image provider,
generates listing text, saves or publishes. The copied extension gets only a
test entry point exposing its real controller. The isolated-world test replaces
photo-job status and model-settings responses with cached results; authentication is not injected.
This proves live host attachment behavior, not a deployed photo backend.

Model-only mode retains the manifest key and worker cache, enables extensions
explicitly, and uses the popup runtime for the normal authentication check.
It keeps the browser open after success or failure. Do not restart this window
while someone is signing in. The dedicated profile's Developer mode is enabled
so the copied unpacked extension can reload for a repeat check.

While the runner is waiting, write `live-photo-options.json` in the result
directory with `{"originals":1,"width":1440}` (or five originals and width 390
for a multirow mobile check), then write `{}` to `live-recheck.json`. The runner
reloads the copied extension and reruns the helper without closing the browser.
The New badge's prior seen state is restored after captures. Desktop/mobile
screens include the actual form, field-local languages and inline model switch.

On 2026-11-01, one-original desktop and five-original 390px runs passed native
upload, pair-first sorting, original order preservation, a subsequent host
rerender and the inline switch. Cached-pair attachment took approximately
3.6 to 4.9 seconds. Provider calls and Save/Publish clicks were zero.

Results and screenshots are retained in `%LOCALAPPDATA%\AutoListerRealBatchTest`.
`model-photos-diagnostic.json` contains the upload timing and observed host DOM
for a failure. `result.json` must report `modelPhotos.rerenderVerified: true`
before treating native ordering as verified. An authentication gate is recorded
as a blocker, never as a pass.
