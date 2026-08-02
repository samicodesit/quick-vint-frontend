# Headless Live Wardrobe Rewrite Test

Use this after the deterministic suite when wardrobe/relisting behavior needs proof against current Vinted DOM and the production AutoLister API.

## What it proves

- Loads the current worktree as an unpacked extension in Chrome for Testing.
- Uses a fresh disposable browser profile; it never opens, closes, copies, or controls normal Chrome.
- Reads a real public Vinted wardrobe and selects a real active item/image.
- Injects the `samicodesit+ai-style-test@gmail.com` AutoLister session.
- Calls the production generation API in Review mode.
- Verifies Apply title, Undo title, and Reject description.
- Never clicks a Vinted save/submit control.

The run consumes one generation credit.

## Deliberate boundary

Vinted challenges or blocks automated login on this IP. The harness therefore inserts a test-only owner marker into the real public profile DOM and serves `tests/fixtures/vinted-listing.html` at the selected protected edit URL. Vinted login, CAPTCHA, real edit-page loading, tab-job orchestration, and saving are not live-tested here; the Playwright suite covers those extension flows deterministically.

## Refresh the AutoLister test session

Request an OTP without an `Origin` header:

```bash
curl -sS https://autolister.app/api/auth/magic-link \
  -H 'Content-Type: application/json' \
  --data '{"email":"samicodesit+ai-style-test@gmail.com"}'
```

Use the connected Gmail tools to read the newest message for that address, then exchange its OTP without logging the value:

```bash
AUTOLISTER_LIVE_TEST_OTP='<otp>' npm run live:session
```

This writes the full session to `/tmp/autolister-live-session.json` with mode `0600`. Tokens and OTPs must stay out of git and summaries.

## Run

Chrome for Testing must exist at:

```text
C:\Users\Sami\AppData\Local\AutoListerDomCanary\ChromeForTesting\chrome-win64\chrome.exe
```

Then run from the frontend repo/worktree:

```bash
npm run test:live:wardrobe
```

The runner copies the current worktree into a Windows temp directory, creates a fresh temp Chrome profile, runs headlessly, and removes both afterward. Evidence is written to `tmp/live-wardrobe-rewrite/diagnostics.json` and viewport screenshots beside it.

To change regional domain when Vinted rate-limits one domain:

```bash
powershell.exe -NoProfile -ExecutionPolicy Bypass \
  -File "$(wslpath -w scripts/run-live-wardrobe-rewrite.ps1)" \
  -VintedOrigin https://www.vinted.nl
```

## Failure guide

- `403`, `Even geduld...`, or a blocked-session page: retry later or use another supported Vinted regional origin. Do not loop aggressively.
- Vinted robot/CAPTCHA page: stop that login route; this harness does not bypass CAPTCHA.
- `Unknown message type`: a persistent profile loaded a stale store worker beside the worktree content script. Use the checked-in runner's fresh disposable profile.
- `Receiving end does not exist`: the edit fixture's content script was not ready. The checked-in harness waits for `.quickvint-tools` before messaging.
- No widget: inspect `00-preflight.png` and `diagnostics.json`; confirm the public profile loaded, has `profile-username`, `profile-location-info`, and real grid items.
- Generation failure: inspect `workFailure.status`, `workFailure.sourceFeedback`, and `05-review-failure.png`. Check production logs only after reading the backend production-log runbook.

Do not run the installed `run-dom-canary.ps1` interactively: its legacy configuration targets a normal Chrome user-data directory and opens a visible window. This live harness is the isolated replacement for agent-driven wardrobe checks.
