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

The first run opens a persistent isolated Chrome profile. Sign into Vinted and
open `https://www.vinted.nl/items/new`. Later runs reuse that login from
`%LOCALAPPDATA%\AutoListerRealBatchTest`.

The run consumes two test-account credits. Production pins this dedicated test
account to `gpt-5.4-mini`; normal customer generations keep the production model.

Structured results are written to
`/tmp/autolister-real-batch-result.json`. A passing result has `"ok": true`, a
nonzero recovery prompt delay, `"1/2 ready"` before resume, two complete work
tabs, and `"saveOrPublishClicks": 0`.

If the extension session expires, request a new email link and exchange its
direct Supabase target before running:

```sh
AUTOLISTER_LIVE_TEST_LINK='https://...supabase.co/auth/v1/verify?token=...' npm run live:session
```

Do not automate CAPTCHA or click Vinted Save/Publish.
