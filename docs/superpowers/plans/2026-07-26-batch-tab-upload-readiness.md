# Batch Tab Upload Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent batch work tabs from starting before Vinted's file input exists, preserve phone-upload temporary files as the generation source, and continuously verify the required DOM through the existing daily canary.

**Architecture:** Reuse the current `BATCH_PING` polling loop by making its `ok` response represent the real Vinted upload-input readiness condition. Keep the existing injection guard as defense in depth, and extend both canary implementations to require and report the same selector.

**Tech Stack:** Chrome Extension Manifest V3, plain JavaScript, Playwright, Node test runner, Windows Task Scheduler.

## Global Constraints

- Phone batch generation must keep using `phone_upload_storage_url`; never fall back to Vinted DOM images.
- A missing Vinted file input must stop before `/api/generate`.
- No new dependency, retry framework, or fixed sleep.
- Chrome Web Store production is 1.3.63; rebuild the unpublished 1.3.64 release.
- Completion requires focused regression, full unit/E2E/build checks, and a real scheduled-canary pass from Vinted.nl.

---

### Task 1: Readiness Regression

**Files:**
- Modify: `tests/e2e/extension.spec.js`
- Test: `tests/e2e/extension.spec.js`

**Interfaces:**
- Consumes: the registered `chrome.runtime.onMessage` content-script listener.
- Produces: a regression test proving `BATCH_PING` is false without Vinted's file input and true when the input exists.

- [ ] **Step 1: Write the failing browser test**

Add a test that opens the real content harness, calls its runtime listener with
`{ type: "BATCH_PING" }`, removes
`[data-testid="add-photos-input"]`, calls again, and asserts literal responses
`{ ok: true }` then `{ ok: false }`.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "reports batch work tab ready only when Vinted photo input exists"
```

Expected: FAIL because the current handler returns `{ ok: true }` after the
input is removed.

### Task 2: Minimal Readiness Fix and Canary Coverage

**Files:**
- Modify: `content.js`
- Modify: `scripts/run-dom-canary.mjs`
- Modify: `docs/superpowers/specs/2026-07-26-batch-tab-upload-readiness-design.md`
- Test: `tests/e2e/extension.spec.js`
- Test: `test/dom-canary-runner.test.js`

**Interfaces:**
- Consumes: `SELECTORS.fileInput` and the existing background
`waitForBatchTabReady()` polling contract.
- Produces: `BATCH_PING -> { ok: boolean }`, where `ok` means the Vinted file
input currently exists; canary payloads with `result.dom.fileInput` and
`selectors.fileInput`.

- [ ] **Step 1: Implement the smallest readiness condition**

Change the `BATCH_PING` response to:

```js
sendResponse({ ok: Boolean(document.querySelector(SELECTORS.fileInput)) });
```

The background loop already retries false responses every 250 ms for up to 30
seconds, so `background.js` stays unchanged.

- [ ] **Step 2: Make the installed scheduled canary cover the same boundary**

In `content.js`, add `fileInput` to the canary DOM result and selector payload,
and require `document.querySelector(SELECTORS.fileInput)` before posting a pass.

In `scripts/run-dom-canary.mjs`, add the same selector to `selectors`,
`collectDomState()`, and the `waitForFunction()` success condition.

- [ ] **Step 3: Run focused checks and verify GREEN**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "reports batch work tab ready only when Vinted photo input exists"
node --test test/dom-canary-runner.test.js
```

Expected: all focused tests pass.

- [ ] **Step 4: Commit implementation**

```bash
git add content.js scripts/run-dom-canary.mjs tests/e2e/extension.spec.js test/dom-canary-runner.test.js docs/superpowers/specs/2026-07-26-batch-tab-upload-readiness-design.md docs/superpowers/plans/2026-07-26-batch-tab-upload-readiness.md
git commit -m "fix: wait for Vinted batch upload input"
```

### Task 3: Full Verification and Real Vinted Canary

**Files:**
- Verify: all extension sources and tests.
- External check: Windows scheduled task `AutoLister DOM Canary`.
- External proof: production `/api/dom-canary` log detail.

**Interfaces:**
- Consumes: the current repository, Windows Chrome-for-Testing profile, and production canary endpoint.
- Produces: full automated verification plus a real Vinted.nl DOM pass proving the required file input.

- [ ] **Step 1: Run the full local verification**

Run:

```bash
npm run test:unit
npm run test:e2e
npm run build:prod
```

Expected: zero failing unit tests, zero failing Playwright tests, and a
successful production minification build.

- [ ] **Step 2: Trigger the existing scheduled runner**

Run the Windows task `AutoLister DOM Canary` manually. Confirm its task result
is zero. The task mirrors the repository into its unpacked extension directory
before launching Vinted.nl.

- [ ] **Step 3: Verify the production canary body**

Fetch `log-detail` for the new `/api/dom-canary` row and verify:

```json
{
  "status": "passed",
  "extensionVersion": "1.3.64",
  "result": {
    "dom": {
      "fileInput": true
    }
  }
}
```

Do not accept a list row alone.

### Task 4: Rebuild Unpublished 1.3.64

**Files:**
- Modify: `CHROME_WEB_STORE_PENDING_VERSION`
- Replace generated artifact: `dist/autolister-ai-v1.3.64.zip`

**Interfaces:**
- Consumes: verified 1.3.64 source and the release-version scripts.
- Produces: a fresh unpublished 1.3.64 Chrome Web Store ZIP and matching
pending-release state.

- [ ] **Step 1: Clear the stale unpublished marker**

Run:

```bash
npm run release:clear-pending
```

- [ ] **Step 2: Build the package**

Run:

```bash
npm run package
```

Expected: `dist/autolister-ai-v1.3.64.zip` is replaced and
`CHROME_WEB_STORE_PENDING_VERSION` contains `1.3.64`.

- [ ] **Step 3: Audit package and repository state**

Run:

```bash
unzip -t dist/autolister-ai-v1.3.64.zip
npm run release:status
git diff --check
git status --short --branch
```

Expected: ZIP integrity passes; release status identifies 1.3.64 as pending;
no uncommitted source changes remain.
