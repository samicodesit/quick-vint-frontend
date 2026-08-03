# Real-Browser Testing

This is the canonical runbook for any agent-driven browser check against live
Vinted. Use the checked-in commands without inventing another Chrome/profile
flow.

## Choose the smallest check

| Need | Command | Real Vinted boundary | Browser profile | Cost |
|---|---|---|---|---|
| Deterministic extension regression | `npm test` | fixtures only | Playwright | none |
| Current create-listing selectors | `npm run test:live -- listing-create` | real authenticated create page | dedicated persistent test profile | none |
| Current wardrobe and production rewrite | `npm run test:live -- wardrobe-rewrite` | real public wardrobe/item/image; protected edit page is a fixture | fresh disposable profile | one generation credit |
| Renew the dedicated Vinted session | `npm run test:live:setup` | manual login/CAPTCHA if Vinted requires it | dedicated persistent test profile | none |

The daily canary and the manual `listing-create` command are the same check.
They load the current checkout as an unpacked extension, visit the real Vinted
create-listing page, and verify the title, description, photo input, and
AutoLister controls.

## Hard rules

- Normal Google Chrome is forbidden. The runner never opens, closes, copies,
  seeds, or controls it.
- Ordinary checks are headless. `test:live:setup` is the only headed command,
  runs only when explicitly requested, and opens Chrome for Testing only.
- Do not automate or bypass Vinted CAPTCHA.
- Do not click save, submit, buy, delete, publish, or message controls.
- Never print or commit OTPs, sessions, tokens, `.env.local`, or browser
  storage.
- Do not loop aggressively after Vinted blocks or rate-limits a session.

## What the shared runner does

`scripts/run-real-browser.ps1`:

1. finds or installs stable Chrome for Testing under
   `%LOCALAPPDATA%\AutoListerDomCanary\ChromeForTesting`;
2. loads local environment values without printing them;
3. copies the exact current checkout to a temporary unpacked-extension
   directory, excluding git data, dependencies, tests, output, and secrets;
4. selects either the dedicated canary profile or a disposable profile;
5. runs the named Node check headlessly and returns its exact exit code;
6. removes the temporary extension copy and disposable profile.

The fresh extension copy avoids a stale Chrome Web Store background worker
answering messages for the worktree content script. The dedicated canary
profile is separate from every personal browser profile.

## Listing-create: real authenticated Vinted

Run:

```bash
npm run test:live -- listing-create
```

Successful evidence means the real authenticated Vinted create page loaded and
all required current selectors exist. A failure with
`result.reason: "auth_required"` means only that the dedicated Vinted session
expired; it is not selector-drift proof.

Renew that session only when required:

```bash
npm run test:live:setup
```

This explicitly opens the dedicated Chrome-for-Testing profile for ten minutes.
Complete Vinted login manually and close it when finished. If Vinted presents a
CAPTCHA, solve it manually or stop; agents must not bypass it. Then rerun the
headless `listing-create` check.

## Wardrobe-rewrite: real public Vinted plus production generation

The wardrobe check uses a real public profile, live wardrobe DOM, a real active
item, and its real image. Vinted blocks automated authenticated edit-page access
from this environment, so the check inserts a synthetic owner marker and serves
the existing Vinted edit-page fixture at that real item's protected edit URL.
It then injects a real AutoLister session, calls the production generation API,
and verifies Apply title, Undo title, and Reject description. It never saves.

The check consumes one generation credit:

```bash
npm run test:live -- wardrobe-rewrite
```

`npm run test:live:wardrobe` is a compatibility alias for the same command.

### Refresh the AutoLister test session

Request an OTP without an `Origin` header:

```bash
curl -sS https://autolister.app/api/auth/magic-link \
  -H 'Content-Type: application/json' \
  --data '{"email":"samicodesit+ai-style-test@gmail.com"}'
```

Read the newest OTP from the connected test mailbox, then exchange it without
logging the value:

```bash
AUTOLISTER_LIVE_TEST_OTP='<otp>' npm run live:session
```

This writes `/tmp/autolister-live-session.json` with mode `0600`.

## Evidence and result interpretation

Every named check writes to:

```text
tmp/real-browser/<check>/diagnostics.json
```

Failure screenshots are written beside it. Wardrobe also records successful
checkpoints there. The directory is gitignored.

- `status: "passed"`: the named assertions passed.
- `status: "failed", result.reason: "auth_required"`: renew the dedicated
  Vinted session, then rerun.
- `status: "failed", result.reason: "selector_timeout"`: inspect the failure
  screenshot and DOM fields; current Vinted DOM or extension injection may have
  changed.
- browser launch/copy error: verify Chrome for Testing and the Windows/WSL paths;
  never fall back to normal Chrome.
- wardrobe `403`, blocked-session page, or robot page: retry later or use a
  supported regional origin once; do not loop.

## Daily task

Install or refresh the daily task from the checkout that should be tested:

```bash
powershell.exe -NoProfile -ExecutionPolicy Bypass \
  -File "$(wslpath -w scripts/install-dom-canary-task.ps1)" \
  -RepoPath "$(wslpath -w "$PWD")" \
  -EnvFile "$(wslpath -w /home/mests/projects/autolister/.env.local)"
```

The task runs every 24 hours by default, waits for `listing-create` to finish,
posts its normal `/api/dom-canary` payload, and exposes the real check exit code
to Windows Task Scheduler. `LastTaskResult = 0` therefore means the selector
check passed, not merely that a browser was launched.

## Adding another live check

Reuse the same foundation:

1. add one feature-specific Node script that exits 0 only when its assertions
   pass and never performs irreversible Vinted actions;
2. add its name, script, profile mode, and AutoLister-session requirement to
   the two-entry map in `scripts/run-real-browser.mjs`;
3. allow the name in `scripts/run-real-browser.ps1` and select `canary` only if
   authenticated Vinted is actually required;
4. add a focused test and one row to the table above.

Do not duplicate Chrome discovery, checkout copying, profile handling, session
paths, cleanup, or result conventions in the new check.
