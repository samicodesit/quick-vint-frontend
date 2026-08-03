# General Real-Browser Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy visible/personal-Chrome canary path and the wardrobe-only launcher with one named, headless-by-default Chrome-for-Testing command that agents and the daily task can reuse.

**Architecture:** A small Node dispatcher validates the check name and runs the existing feature-specific Node check. One PowerShell wrapper owns Chrome-for-Testing discovery, exact-worktree copying, profile choice, environment loading, cleanup, and exit propagation. The authenticated daily canary uses a dedicated persistent test profile; public/hybrid checks use a disposable profile.

**Tech Stack:** Node.js standard library, Playwright already in the repository, PowerShell, Windows Task Scheduler, Chrome for Testing.

## Global Constraints

- Do not add a dependency or plugin framework.
- Default to headless execution.
- Never open, close, copy, seed, or control normal Google Chrome or its user-data directory.
- Never automate or bypass Vinted CAPTCHA; report `auth_required`.
- Never click a Vinted save, submit, buy, delete, publish, or message control.
- Keep `/api/dom-canary` payloads backward compatible and keep tokens out of output, screenshots, git, and result payloads.
- Do not deploy or push during this work.

---

### Task 1: Add the named real-browser dispatcher

**Files:**
- Create: `scripts/run-real-browser.mjs`
- Create: `test/real-browser-runner.test.js`

**Interfaces:**
- Consumes: a check name from `process.argv[2]` and the environment prepared by the PowerShell wrapper.
- Produces: `resolveRealBrowserCheck(name): { name: string, script: string, profileMode: "canary" | "disposable", requiresSession: boolean }` and `runRealBrowser(name, options): number`.

- [ ] **Step 1: Write the failing dispatcher tests**

```js
const assert = require("node:assert/strict");
const test = require("node:test");

test("resolves the two supported real-browser checks", async () => {
  const { resolveRealBrowserCheck } = await import("../scripts/run-real-browser.mjs");

  assert.deepEqual(resolveRealBrowserCheck("listing-create"), {
    name: "listing-create",
    script: "run-dom-canary.mjs",
    profileMode: "canary",
    requiresSession: false,
  });
  assert.deepEqual(resolveRealBrowserCheck("wardrobe-rewrite"), {
    name: "wardrobe-rewrite",
    script: "run-live-wardrobe-rewrite.mjs",
    profileMode: "disposable",
    requiresSession: true,
  });
});

test("rejects unknown real-browser checks", async () => {
  const { resolveRealBrowserCheck } = await import("../scripts/run-real-browser.mjs");
  assert.throws(() => resolveRealBrowserCheck("unknown"), /Unknown real-browser check/);
});

test("returns the selected child check exit code", async () => {
  const { runRealBrowser } = await import("../scripts/run-real-browser.mjs");
  const spawn = () => ({ status: 7, error: undefined });
  assert.equal(runRealBrowser("listing-create", { spawn }), 7);
});
```

- [ ] **Step 2: Run the focused test and confirm the missing-module failure**

Run: `node --test test/real-browser-runner.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/run-real-browser.mjs`.

- [ ] **Step 3: Implement the minimal dispatcher**

Use a frozen two-entry object, `spawnSync`, `process.execPath`, and
`fileURLToPath(import.meta.url)`. `runRealBrowser` must throw when `spawnSync`
returns an `error`, return `status` when it is an integer, and otherwise return
`1`. Guard CLI execution with the same resolved-path pattern already used by
`scripts/run-dom-canary.mjs`:

```js
const checks = Object.freeze({
  "listing-create": {
    name: "listing-create",
    script: "run-dom-canary.mjs",
    profileMode: "canary",
    requiresSession: false,
  },
  "wardrobe-rewrite": {
    name: "wardrobe-rewrite",
    script: "run-live-wardrobe-rewrite.mjs",
    profileMode: "disposable",
    requiresSession: true,
  },
});
```

Pass `stdio: "inherit"` and `env: process.env` to the child. Do not add an
abstraction beyond these two exported functions.

- [ ] **Step 4: Run the focused test**

Run: `node --test test/real-browser-runner.test.js`

Expected: 3 tests pass.

- [ ] **Step 5: Commit the dispatcher**

```bash
git add scripts/run-real-browser.mjs test/real-browser-runner.test.js
git commit -m "Add named real browser check dispatcher"
```

---

### Task 2: Replace the wardrobe-only Windows bootstrap with one safe wrapper

**Files:**
- Create: `scripts/run-real-browser.ps1`
- Delete: `scripts/run-live-wardrobe-rewrite.ps1`
- Create: `test/real-browser-wrapper.test.ps1`
- Modify: `package.json`

**Interfaces:**
- Consumes: `-Check listing-create|wardrobe-rewrite`, optional `-Setup`, `-ChromePath`, `-SessionFile`, `-VintedOrigin`, `-CanaryRoot`, and `-EnvFile`.
- Produces: the environment expected by both existing Node checks and the exact child exit code.

- [ ] **Step 1: Add a failing executable wrapper-contract test**

Create a PowerShell test that invokes the wrapper's no-browser `-Describe`
mode and checks its returned JSON:

```powershell
$listing = & $wrapper -Check listing-create -Describe | ConvertFrom-Json
if ($listing.profileMode -ne "canary") { throw "listing-create profile mode" }
if (-not $listing.headless) { throw "listing-create should be headless" }
if ($listing.profileDir -notlike "*AutoListerDomCanary*ChromeUserData") {
  throw "listing-create must use the dedicated profile"
}
if ($listing.profileDir -like "*Google*Chrome*User Data*") {
  throw "normal Chrome profile selected"
}

$wardrobe = & $wrapper -Check wardrobe-rewrite -Describe | ConvertFrom-Json
if ($wardrobe.profileMode -ne "disposable") { throw "wardrobe profile mode" }

$setupRejected = $false
try { & $wrapper -Check wardrobe-rewrite -Setup -Describe } catch {
  $setupRejected = $true
}
if (-not $setupRejected) { throw "wardrobe setup must be rejected" }
```

- [ ] **Step 2: Run the focused test and confirm the missing-file failure**

Run:

```bash
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(wslpath -w test/real-browser-wrapper.test.ps1)"
```

Expected: FAIL because `scripts/run-real-browser.ps1` does not exist.

- [ ] **Step 3: Implement `scripts/run-real-browser.ps1`**

Move the working logic from `scripts/run-live-wardrobe-rewrite.ps1` and the
Chrome-for-Testing discovery function from `scripts/install-dom-canary-task.ps1`
into this wrapper. Use these exact rules:

```powershell
param(
  [ValidateSet("listing-create", "wardrobe-rewrite")]
  [string]$Check,
  [switch]$Setup,
  [switch]$Describe,
  [string]$ChromePath = "",
  [string]$SessionFile = "\\wsl.localhost\Ubuntu\tmp\autolister-live-session.json",
  [string]$VintedOrigin = "https://www.vinted.nl",
  [string]$CanaryRoot = "$env:LOCALAPPDATA\AutoListerDomCanary",
  [string]$EnvFile = "\\wsl.localhost\Ubuntu\home\mests\projects\autolister\.env.local"
)
```

- Locate or install Chrome for Testing under
  `$CanaryRoot\ChromeForTesting\chrome-win64\chrome.exe` using the existing
  official Chrome-for-Testing metadata URL.
- Load non-comment `KEY=VALUE` lines from `$EnvFile` into the process without
  printing them.
- Copy the current repository to
  `$env:TEMP\AutoListerRealBrowser-<guid>\Extension` with the existing
  `robocopy` exclusions plus `.env*` and `tmp`.
- Use `$CanaryRoot\ChromeUserData` for `listing-create` and the temporary
  root's `ChromeUserData` for `wardrobe-rewrite`.
- Reject `-Setup` with `wardrobe-rewrite`.
- For `-Describe`, emit JSON containing `check`, `profileMode`, `profileDir`,
  and `headless`, then exit before loading secrets, copying files, installing
  Chrome, or launching Node.
- Require `$SessionFile` only for `wardrobe-rewrite`.
- Set `DOM_CANARY_PROFILE_DIR`, `DOM_CANARY_EXTENSION_PATH`,
  `DOM_CANARY_BROWSER_EXECUTABLE`, `DOM_CANARY_URL` to
  `$VintedOrigin/items/new`, `AUTOLISTER_LIVE_USER_DATA`,
  `AUTOLISTER_LIVE_EXTENSION`, `AUTOLISTER_LIVE_SESSION_FILE`,
  `AUTOLISTER_LIVE_VINTED_ORIGIN`, and
  `AUTOLISTER_LIVE_OUTPUT_DIR` to
  `$repoPath/tmp/real-browser/$Check`.
- For `-Setup`, set `DOM_CANARY_HEADED=1`, `DOM_CANARY_NO_POST=1`, and
  `DOM_CANARY_KEEP_OPEN_MS=600000`. Normal runs clear those process values.
- Run `node scripts/run-real-browser.mjs $Check`, capture `$LASTEXITCODE`,
  remove the temporary extension copy/profile in `finally`, and
  `exit $exitCode`.

Do not enumerate or terminate Chrome processes. Do not accept a normal-Chrome
profile path parameter.

- [ ] **Step 4: Replace package scripts and delete the old wrapper**

Set these entries:

```json
"test:live": "powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"$(wslpath -w scripts/run-real-browser.ps1)\" -Check",
"test:live:setup": "powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"$(wslpath -w scripts/run-real-browser.ps1)\" -Check listing-create -Setup",
"test:live:wardrobe": "npm run test:live -- wardrobe-rewrite"
```

Keep `live:session`. Remove the old `canary:dom:setup` command because the new
setup command replaces it. Keep `canary:dom` and `canary:dom:check` as direct
Node compatibility commands.

- [ ] **Step 5: Run the focused test and inspect package parsing**

Run:

```bash
node --test test/real-browser-runner.test.js
node -e 'JSON.parse(require("node:fs").readFileSync("package.json", "utf8"))'
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(wslpath -w test/real-browser-wrapper.test.ps1)"
```

Expected: all focused tests pass and the JSON command exits 0.

- [ ] **Step 6: Commit the shared wrapper**

```bash
git add package.json scripts/run-real-browser.ps1 scripts/run-live-wardrobe-rewrite.ps1 test/real-browser-wrapper.test.ps1 docs/superpowers/plans/2026-08-03-general-real-browser-testing.md
git commit -m "Unify real browser test bootstrap"
```

---

### Task 3: Make both checks produce consistent evidence and honest exits

**Files:**
- Modify: `scripts/run-dom-canary.mjs`
- Modify: `scripts/run-live-wardrobe-rewrite.mjs`
- Modify: `test/dom-canary-runner.test.js`
- Modify: `test/real-browser-runner.test.js`

**Interfaces:**
- Consumes: the profile, extension, browser, and output environment variables from Task 2.
- Produces: `tmp/real-browser/<check>/diagnostics.json`, failure screenshots, concise terminal status, and exit 0 only for a passed check.

- [ ] **Step 1: Write failing canary configuration and exit tests**

Extend `test/dom-canary-runner.test.js` so `getConfig` is expected to expose:

```js
assert.equal(config.outputDir, "/tmp/real-browser/listing-create");
```

using `AUTOLISTER_LIVE_OUTPUT_DIR` in the test environment. Replace the
reported-failure override test with:

```js
test("DOM canary exits nonzero for every reported failure", async () => {
  const { getProcessExitCode } = await import("../scripts/run-dom-canary.mjs");
  assert.equal(getProcessExitCode({ status: "passed" }), 0);
  assert.equal(getProcessExitCode({ status: "failed" }), 1);
});
```

Add a test that checks an auth redirect remains API compatible:

```js
const failure = classifyCanaryFailure("https://www.vinted.nl/member/login");
assert.deepEqual(failure, { reason: "auth_required" });
```

- [ ] **Step 2: Run the canary tests and confirm the new expectation fails**

Run: `node --test test/dom-canary-runner.test.js`

Expected: FAIL because `outputDir` is absent and the exit-zero override still
exists.

- [ ] **Step 3: Add diagnostics to the listing-create check**

In `getConfig`, set `outputDir` from `AUTOLISTER_LIVE_OUTPUT_DIR` with a
fallback of `tmp/real-browser/listing-create`. In `runDomCanary`:

- create the output directory;
- on failure, capture `failure.png` before closing the context;
- write the complete payload as `diagnostics.json` with a trailing newline;
- retain top-level `status: "failed"` and `result.reason: "auth_required"` so
  the existing API schema stays compatible;
- simplify `getProcessExitCode(payload)` to return 0 only for `passed`.

Do not include the bearer secret or browser storage in the diagnostics.

- [ ] **Step 4: Point wardrobe evidence at the shared output directory**

Change only the output-directory declaration in
`scripts/run-live-wardrobe-rewrite.mjs`:

```js
const outputDir = path.resolve(
  process.env.AUTOLISTER_LIVE_OUTPUT_DIR ||
    path.resolve(scriptDir, "../tmp/real-browser/wardrobe-rewrite"),
);
```

Keep its existing session injection, real-public-page selection, fixture
boundary, Apply/Undo/Reject checks, and no-save behavior unchanged.

- [ ] **Step 5: Run focused unit tests**

Run:

```bash
node --test test/dom-canary-runner.test.js test/real-browser-runner.test.js
```

Expected: all focused tests pass.

- [ ] **Step 6: Commit consistent results**

```bash
git add scripts/run-dom-canary.mjs scripts/run-live-wardrobe-rewrite.mjs test/dom-canary-runner.test.js test/real-browser-runner.test.js
git commit -m "Record real browser test diagnostics"
```

---

### Task 4: Make the daily task call the real check and wait for its result

**Files:**
- Modify: `scripts/install-dom-canary-task.ps1`
- Create: `test/dom-canary-installer.test.ps1`

**Interfaces:**
- Consumes: the checked-in `scripts/run-real-browser.ps1`, dedicated canary root, repository path, environment file, and Vinted URL.
- Produces: a scheduled task whose action waits for `listing-create` and returns its exact exit code.

- [ ] **Step 1: Write a failing executable installer contract test**

Create a temporary fake repository whose `scripts/run-real-browser.ps1`
captures its arguments and exits 7. Run the installer with `-NoRegister`, then
execute the generated runner and assert:

```powershell
if ($LASTEXITCODE -ne 7) { throw "scheduled runner hid child failure" }
$capture = Get-Content -Raw $capturePath | ConvertFrom-Json
if ($capture.Check -ne "listing-create") { throw "wrong daily check" }
if ($capture.CanaryRoot -ne $canaryRoot) { throw "wrong dedicated root" }
```

Always remove the temporary root in `finally`.

- [ ] **Step 2: Run the installer test and confirm the legacy behavior fails it**

Run:

```bash
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(wslpath -w test/dom-canary-installer.test.ps1)"
```

Expected: FAIL because the legacy installer does not accept `-NoRegister` and
does not generate the shared-wrapper runner.

- [ ] **Step 3: Simplify the installer-generated runner**

Remove the Chrome download, profile seeding, account-file generation,
`Stop-Process`, worktree copy, extension config generation, and
`Start-Process` blocks. They now belong to the shared wrapper or the existing
Node canary.

Default `$CanaryRoot` to
`$env:LOCALAPPDATA\AutoListerDomCanary`. Generate a tiny runner that executes:

```powershell
& "$repoPath\scripts\run-real-browser.ps1" `
  -Check listing-create `
  -CanaryRoot "$canaryRoot" `
  -EnvFile "$envFile" `
  -VintedOrigin "$vintedOrigin"
exit `$LASTEXITCODE
```

The scheduled task action continues to invoke that generated runner. Keep the
24-hour default interval, wake/start-when-available settings, and 20-minute
execution limit. Add `-NoRegister` to write the runner and skip only
`Register-ScheduledTask`; this makes the real runner executable in isolation.
Print the dedicated setup command after installation; do not run headed setup
automatically.

- [ ] **Step 4: Run focused installer and canary tests**

Run:

```bash
node --test test/dom-canary-runner.test.js test/real-browser-runner.test.js
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(wslpath -w test/dom-canary-installer.test.ps1)"
```

Expected: all focused tests pass.

- [ ] **Step 5: Commit the scheduled-task migration**

```bash
git add scripts/install-dom-canary-task.ps1 test/dom-canary-installer.test.ps1 docs/superpowers/plans/2026-08-03-general-real-browser-testing.md
git commit -m "Run daily canary through headless test harness"
```

---

### Task 5: Make the reusable method obvious to future agents

**Files:**
- Create: `docs/real-browser-testing.md`
- Modify: `docs/live-wardrobe-rewrite-testing.md`
- Modify: `docs/testing-strategy.md`
- Modify: `AGENTS.md`
- Modify locally, outside this repository: `/home/mests/projects/autolister/AGENTS.md`

**Interfaces:**
- Consumes: commands and behavior delivered by Tasks 1–4.
- Produces: one canonical entry point that agents discover without user prompting.

- [ ] **Step 1: Write the canonical runbook**

Document this decision table in `docs/real-browser-testing.md`:

| Need | Command | Vinted auth | Profile | Cost |
|---|---|---|---|---|
| Deterministic extension regression | `npm test` | none | Playwright fixture | none |
| Current create-listing selectors | `npm run test:live -- listing-create` | dedicated canary session | persistent test-only | none |
| Current public wardrobe plus production generation | `npm run test:live -- wardrobe-rewrite` | public/hybrid boundary | disposable | one generation credit |
| Renew dedicated Vinted session | `npm run test:live:setup` | manual, CAPTCHA if Vinted requires it | persistent test-only | none |

State plainly:

- normal Chrome is forbidden;
- ordinary checks are headless;
- setup is the only headed command and uses Chrome for Testing;
- `auth_required` means renew the dedicated session, not selector drift;
- diagnostics live under `tmp/real-browser/<check>/`;
- the daily task runs `listing-create` through the same wrapper;
- no live check saves or publishes a listing;
- no CAPTCHA bypass is attempted;
- the wardrobe check consumes one production generation credit and retains its
  documented synthetic-owner/edit-fixture boundary.

Include installation, manual commands, result interpretation, evidence paths,
and the existing session-refresh commands without exposing token values.

- [ ] **Step 2: Replace duplicate instructions with pointers**

Make `docs/live-wardrobe-rewrite-testing.md` a short wardrobe-specific note
that points to `docs/real-browser-testing.md` and retains only the hybrid-test
boundary and generation-credit warning. Update `docs/testing-strategy.md` and
the repository `AGENTS.md` to point to the canonical runbook for every
agent-driven real-browser test.

Update the parent workspace `AGENTS.md` pointer to the active frontend
checkout's `docs/real-browser-testing.md`. This local instruction file is not
part of the frontend commit.

- [ ] **Step 3: Verify documentation commands and stale warnings**

Run:

```bash
rg -n "normal Chrome|test:live|auth_required|daily|generation credit" AGENTS.md docs/real-browser-testing.md docs/live-wardrobe-rewrite-testing.md docs/testing-strategy.md
rg -n "legacy configuration|run-live-wardrobe-rewrite\.ps1|canary:dom:setup" AGENTS.md docs package.json scripts test
```

Expected: the first command finds the canonical rules; the second finds no
stale command or legacy-runner warning.

- [ ] **Step 4: Commit the runbook**

```bash
git add AGENTS.md docs/real-browser-testing.md docs/live-wardrobe-rewrite-testing.md docs/testing-strategy.md
git commit -m "Document reusable real browser testing"
```

---

### Task 6: Verify locally without deployment

**Files:**
- Modify only if a verification failure reveals a defect in files from Tasks 1–5.

**Interfaces:**
- Consumes: the complete implementation.
- Produces: current test/build/live evidence and a clean feature worktree.

- [ ] **Step 1: Run focused and full deterministic verification**

Run:

```bash
node --test test/dom-canary-runner.test.js test/real-browser-runner.test.js test/live-test-session.test.js
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(wslpath -w test/dom-canary-installer.test.ps1)"
npm test
npm run build:prod
```

Expected: all focused tests, unit tests, Playwright E2E tests, and the production
build pass.

- [ ] **Step 2: Run the existing wardrobe live check through the new command**

Run: `npm run test:live -- wardrobe-rewrite`

Expected: `Live wardrobe rewrite check passed`, exit 0, and
`tmp/real-browser/wardrobe-rewrite/diagnostics.json` records Apply, Undo, and
Reject success. This consumes one generation credit.

- [ ] **Step 3: Run the daily listing check headlessly**

Load `/home/mests/projects/autolister/.env.local` without printing it, then run:

```bash
npm run test:live -- listing-create
```

Expected when the dedicated Vinted session is current: passed with all listing
selectors true. Expected when it has expired: failed with
`result.reason: "auth_required"`; this is an honest runner pass but not selector
stability proof. Do not open headed setup automatically.

- [ ] **Step 4: Inspect evidence without exposing secrets**

Run:

```bash
node -e 'for (const f of process.argv.slice(1)) { const d=require("./"+f); console.log(f, d.status, d.result?.reason || "", d.result?.dom || d.checks || ""); }' tmp/real-browser/listing-create/diagnostics.json tmp/real-browser/wardrobe-rewrite/diagnostics.json
git status --short
git log --oneline -8
```

Expected: diagnostics contain no tokens, the feature worktree is clean, and no
deployment or push commit exists.

- [ ] **Step 5: Commit a verification fix only if Step 1–4 required code changes**

Stage only the files repaired because of failed verification and commit them:

```bash
git add package.json AGENTS.md docs/real-browser-testing.md docs/live-wardrobe-rewrite-testing.md docs/testing-strategy.md scripts/run-real-browser.mjs scripts/run-real-browser.ps1 scripts/run-live-wardrobe-rewrite.ps1 scripts/run-live-wardrobe-rewrite.mjs scripts/run-dom-canary.mjs scripts/install-dom-canary-task.ps1 test/real-browser-runner.test.js test/real-browser-wrapper.test.ps1 test/dom-canary-runner.test.js test/dom-canary-installer.test.ps1
git commit -m "Fix real browser verification regressions"
```

If no repair was required, do not create an empty commit.
