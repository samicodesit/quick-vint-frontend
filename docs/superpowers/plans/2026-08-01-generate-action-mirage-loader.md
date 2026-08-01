# Generate Action Mirage Loader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the approved LDRS Mirage animation with ellipsis-free busy copy on every button that starts generation, then publish extension 1.3.69.

**Architecture:** Keep the official five-circle SVG geometry and animation local inside `content.js`. Reuse the existing `is-loading` state and shared loading helper; only buttons containing Mirage markup use it, so the ordinary Phone upload button keeps its spinner.

**Tech Stack:** Chrome MV3 content script, inline SVG/CSS, Playwright, Node test runner.

## Global Constraints

- Apply Mirage to main `Generate`, phone-modal `Done + Generate`, and batch `Generate N listings`.
- Use `Generating` without an ellipsis; batch preflight uses `Starting`.
- Preserve idle labels, success state, button dimensions, accessibility, and reduced-motion behavior.
- Port UI Ball/LDRS Mirage under its MIT license; do not add a dependency or CDN import.
- Do not change capacity math: `available` already includes usable plan allowance plus pack credits.

---

### Task 1: Lock the generation-action behavior with browser tests

**Files:**
- Modify: `tests/e2e/extension.spec.js`

**Interfaces:**
- Consumes: existing content harness, delayed generation routes, phone modal, and batch organizer helpers.
- Produces: assertions for `.quickvint-mirage`, ellipsis-free labels, icon replacement, and stable button geometry.

- [ ] **Step 1: Add assertions to the existing main, phone-modal, and batch generation flows**

Assert the appropriate button has one `.quickvint-mirage`, that it becomes visible while busy, that the wand is hidden, and that the label is exactly `Generating` or `Starting`. Capture the main button bounds before and during loading and require identical width and height.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "Mirage|loaded MV3 batch flow|phone-upload files"
```

Expected: FAIL because `.quickvint-mirage` does not exist and busy copy still contains `...`.

---

### Task 2: Port official Mirage markup and motion

**Files:**
- Modify: `content.js`
- Test: `tests/e2e/extension.spec.js`

**Interfaces:**
- Produces: `mirageLoaderSvg(filterId)` returning the official five-circle SVG/filter markup and shared `.quickvint-mirage` styling.
- Consumes: the existing `is-loading` class used by `updateButtonUI()` and `setActionButtonLoading()`.

- [ ] **Step 1: Add the minimal local Mirage SVG helper**

Use five circles, the official Gaussian blur/color matrix filter, and a unique filter ID per button:

```js
function mirageLoaderSvg(filterId) {
  return `<span class="quickvint-mirage" aria-hidden="true"><svg viewBox="0 0 30 6.9"><circle class="dot" /><circle class="dot" /><circle class="dot" /><circle class="dot" /><circle class="dot" /><defs>...</defs></svg></span>`;
}
```

- [ ] **Step 2: Port the official motion into existing injected CSS**

Use a 30px white Mirage, five staggered delays, the official translate-and-scale `stream` motion, and paused animation under `prefers-reduced-motion: reduce`. Hide Mirage by default and show it only for `.quickvint-generation-action.is-loading`.

- [ ] **Step 3: Add Mirage markup to all three generation buttons**

Add `quickvint-generation-action` and unique Mirage markup to the main button, phone-modal generation button, and batch start button. Keep each existing wand/idle label intact.

- [ ] **Step 4: Remove ellipses from generation busy labels**

Change main and phone-modal busy copy from `Generating...` to `Generating`; change batch preflight from `Starting...` to `Starting`. Do not alter unrelated waiting or preparation copy.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run the focused Playwright command from Task 1. Expected: all selected tests pass.

- [ ] **Step 6: Run capacity entitlement tests**

Run:

```bash
pnpm run test -- src/utils/__tests__/rateLimiter.entitlements.test.ts
```

Expected: free, paid, custom-limit, and pack-credit capacity cases pass without API changes.

---

### Task 3: Verify and release extension 1.3.69

**Files:**
- Modify: `manifest.json`
- Modify: `CHROME_WEB_STORE_VERSION` only through the existing release workflow.

**Interfaces:**
- Consumes: verified content script and existing Chrome Web Store workflow.
- Produces: packaged and submitted extension version `1.3.69`.

- [ ] **Step 1: Run the full local release gate**

```bash
npm run verify:production
```

Expected: unit tests, Playwright suite, and production build pass.

- [ ] **Step 2: Bump and package 1.3.69**

Run the existing release bump/check/package commands. Inspect the ZIP manifest and confirm no localhost or credential strings exist.

- [ ] **Step 3: Commit and push the verified release source**

Commit only the spec, plan, runtime, tests, manifest, and release metadata needed for 1.3.69; push `main`.

- [ ] **Step 4: Dispatch and monitor Chrome Web Store upload-and-submit**

Run the existing `Chrome Web Store Release` workflow with `mode=upload-and-submit` and `bump_patch=false`. Report Google’s exact returned state (`PENDING_REVIEW` or `PUBLISHED`).
