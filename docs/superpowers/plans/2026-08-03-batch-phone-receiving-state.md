# Batch Phone Receiving State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the obsolete two-source chooser with one centered, proportionate receiving state after batch phone upload locks in.

**Architecture:** Keep the existing upload session, polling, and status calculations. The shared phone-lock function replaces the source grid once with a centered status element that reuses the existing title/copy nodes, while `renderBatchUploadStrip` continues driving receiving, finalizing, and stale text.

**Tech Stack:** Plain JavaScript, embedded CSS, Playwright.

## Global Constraints

- Adapt the MIT-licensed LDRS Treadmill loader from <https://github.com/GriffinJohnston/ldrs>; retain attribution beside the adapted source.
- Add no package or runtime dependency.
- Render the loader at 76px by 45px, preserving the source `1:0.59` aspect ratio at every supported viewport.
- Keep Mirage exclusive to AI generation and Treadmill exclusive to phone-photo transfer.
- Keep existing upload, polling, finalization, stale-session, cancellation, computer-upload, and grouping behavior unchanged.
- Pause animation for reduced-motion users and while the connection is stale.

---

### Task 1: Center the locked phone receiving state

**Files:**
- Modify: `tests/e2e/extension.spec.js:1799-1851`
- Modify: `tests/e2e/extension.spec.js:4588-4714`
- Modify: `content.js:1020-1040`
- Modify: `content.js:8886-8955`
- Modify: `content.js:13959-13982`
- Modify: `content.js:14119-14195`

**Interfaces:**
- Consumes: existing `batchInputSource`, `batchExpectedCount`, `batchRemoteFiles`, `lockBatchComputerControlsForPhone()`, and `renderBatchUploadStrip()` state.
- Produces: `treadmillLoaderHtml(): string` and one `.batch-phone-receiving.batch-wait-panel` DOM state containing the existing `.batch-wait-title` and `.batch-wait-copy` nodes.

- [x] **Step 1: Tighten the existing browser checks around phone lock**

In `locks batch computer controls after phone photos begin arriving`, replace assertions for disabled computer buttons with assertions for the new single state, normal animation, and exact proportions:

```js
await expect(modal.locator(".batch-source-grid")).toHaveCount(0);
await expect(modal.locator(".batch-phone-receiving")).toBeVisible();
await expect(modal.locator(".batch-wait-title")).toContainText(
  "Receiving 1 photo",
);
await expect(modal.locator(".batch-wait-copy")).toHaveText(
  "Keep the phone page open.",
);
await expect(modal.locator(".batch-choose-files")).toHaveCount(0);
const loader = modal.locator(".quickvint-treadmill");
const loaderBox = await loader.boundingBox();
expect(loaderBox.width).toBeGreaterThanOrEqual(75);
expect(loaderBox.width).toBeLessThanOrEqual(77);
expect(loaderBox.height).toBeGreaterThanOrEqual(44);
expect(loaderBox.height).toBeLessThanOrEqual(46);
expect(
  await loader.locator(".quickvint-treadmill-cube").evaluate((cube) => [
    getComputedStyle(cube).animationName,
    getComputedStyle(cube, "::after").animationName,
  ]),
).toEqual(["quickvintTreadmillMove", "quickvintTreadmillMorph"]);
```

Advance `Date.now()` by 16 seconds in the same test, wait for the shortened poll, and assert stale text plus paused animation:

```js
await page.evaluate(() => {
  const staleNow = Date.now() + 16000;
  Date.now = () => staleNow;
});
await expect(modal.locator(".batch-wait-title")).toContainText("Check phone");
await expect(modal.locator(".batch-wait-copy")).toHaveText(
  "Reopen the phone page, then leave it visible.",
);
expect(
  await loader.locator(".quickvint-treadmill-cube").evaluate((cube) => [
    getComputedStyle(cube).animationPlayState,
    getComputedStyle(cube, "::after").animationPlayState,
  ]),
).toEqual(["paused", "paused"]);
```

In `protects an expected phone batch before the first photo arrives`, set a narrow viewport and reduced motion before opening the harness, then replace the removed computer-control assertions:

```js
await page.setViewportSize({ width: 390, height: 844 });
await page.emulateMedia({ reducedMotion: "reduce" });
```

```js
await expect(modal.locator(".batch-source-grid")).toHaveCount(0);
await expect(modal.locator(".batch-phone-receiving")).toBeVisible();
await expect(modal.locator(".batch-choose-files")).toHaveCount(0);
expect(
  await modal.locator(".quickvint-treadmill-cube").evaluate((cube) => [
    getComputedStyle(cube).animationPlayState,
    getComputedStyle(cube, "::after").animationPlayState,
  ]),
).toEqual(["paused", "paused"]);
```

Keep the existing expected-count text, helper copy, close confirmation, finalizing, and gallery assertions unchanged.

- [x] **Step 2: Run the focused browser checks and verify they fail for the missing state**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "locks batch computer controls after phone photos begin arriving|protects an expected phone batch before the first photo arrives|shows finalizing while every expected phone photo awaits completion"
```

Expected: the phone-lock tests fail because `.batch-source-grid` remains and `.batch-phone-receiving` does not exist; the finalizing fixture continues to pass.

- [x] **Step 3: Add the sourced loader markup and styles**

Beside `mirageLoaderSvg`, retain a short MIT attribution comment and add the dependency-free markup helper:

```js
function treadmillLoaderHtml() {
  return `<span class="quickvint-treadmill" aria-hidden="true"><span class="quickvint-treadmill-track"><span class="quickvint-treadmill-cube"></span></span></span>`;
}
```

Adapt the official Treadmill CSS to scoped names in the existing batch-modal stylesheet. Preserve its size ratio and motion rather than stretching it:

```css
#${BATCH_MODAL_ID} .batch-phone-receiving {
  display: flex;
  flex: 1 1 auto;
  min-height: 278px;
  align-items: center;
  justify-content: center;
  text-align: center;
}

#${BATCH_MODAL_ID} .batch-phone-receiving-content {
  display: flex;
  width: min(260px, 100%);
  flex-direction: column;
  align-items: center;
}

#${BATCH_MODAL_ID} .quickvint-treadmill {
  --quickvint-treadmill-size: 76px;
  --quickvint-treadmill-cube: calc(var(--quickvint-treadmill-size) * .2);
  display: inline-flex;
  width: var(--quickvint-treadmill-size);
  height: calc(var(--quickvint-treadmill-size) * .59);
  margin-bottom: 18px;
  align-items: center;
  justify-content: center;
  color: #4f46e5;
}

#${BATCH_MODAL_ID} .quickvint-treadmill-track {
  display: flex;
  width: 100%;
  height: calc(100% - var(--quickvint-treadmill-cube) / 2);
  padding-bottom: calc(var(--quickvint-treadmill-cube) / 2);
  align-items: flex-end;
  justify-content: center;
}

#${BATCH_MODAL_ID} .quickvint-treadmill-cube {
  --quickvint-treadmill-height: calc(var(--quickvint-treadmill-size) * .8);
  display: flex;
  width: var(--quickvint-treadmill-cube);
  height: var(--quickvint-treadmill-height);
  align-items: center;
  transform: rotate(-90deg);
  transform-origin: center bottom;
  animation: quickvintTreadmillMove 1.25s linear infinite;
}

#${BATCH_MODAL_ID} .quickvint-treadmill-cube::after {
  width: var(--quickvint-treadmill-cube);
  height: var(--quickvint-treadmill-cube);
  border-radius: 25%;
  background: currentColor;
  content: "";
  transform-origin: center left;
  animation: quickvintTreadmillMorph 1.25s linear infinite;
}
```

Copy the official `metronome` and `morph` keyframe values under the unique names `quickvintTreadmillMove` and `quickvintTreadmillMorph`. Add one shared pause rule:

```css
#${BATCH_MODAL_ID} .batch-phone-receiving.is-stale .quickvint-treadmill-cube,
#${BATCH_MODAL_ID} .batch-phone-receiving.is-stale .quickvint-treadmill-cube::after {
  animation-play-state: paused;
}

@media (prefers-reduced-motion: reduce) {
  #${BATCH_MODAL_ID} .quickvint-treadmill-cube,
  #${BATCH_MODAL_ID} .quickvint-treadmill-cube::after {
    animation-play-state: paused;
  }
}
```

Do not add a loader dependency, another stylesheet, or a generalized loader abstraction.

- [x] **Step 4: Replace the source grid inside the shared phone-lock function**

After setting `batchInputSource = "phone"`, move the existing status copy into one new element and replace the whole grid:

```js
const grid = panel.closest(".batch-source-grid");
const sourceCopy = panel.querySelector(".batch-source-copy");
if (!grid || !sourceCopy) return;

const receiving = document.createElement("section");
receiving.className = "batch-phone-receiving batch-wait-panel";
receiving.setAttribute("role", "status");
receiving.setAttribute("aria-live", "polite");
receiving.setAttribute("aria-busy", "true");
receiving.innerHTML = `<div class="batch-phone-receiving-content">${treadmillLoaderHtml()}</div>`;
receiving.querySelector(".batch-phone-receiving-content")?.appendChild(sourceCopy);
grid.replaceWith(receiving);
```

Delete the now-obsolete QR removal, computer-button disabling, `aria-disabled`, and `Receiving from phone` mutations from `lockBatchComputerControlsForPhone()`. The removed grid makes those controls unavailable without maintaining a fake disabled chooser.

In `renderBatchUploadStrip()`, toggle stale/busy state from the already-computed values:

```js
const receiving = document.querySelector(
  `#${BATCH_MODAL_ID} .batch-phone-receiving`,
);
receiving?.classList.toggle("is-stale", isStale);
receiving?.setAttribute(
  "aria-busy",
  String(!batchIsComplete && !isStale),
);
```

Keep `.batch-wait-panel` on the replacement so `refreshBatchWaitingState()` and `maybeAutoOpenBatchGrouping()` continue using their existing selectors without duplicated flow logic.

- [x] **Step 5: Run focused verification**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "locks batch computer controls after phone photos begin arriving|protects an expected phone batch before the first photo arrives|shows finalizing while every expected phone photo awaits completion"
```

Expected: 3 passed, including normal motion, stale pause, narrow reduced motion, pre-first-photo lock, and finalizing copy.

- [x] **Step 6: Run the complete frontend production gate**

Run:

```bash
npm run test:ci
```

Expected: unit tests, the complete Playwright suite, and the production extension build all pass.

- [x] **Step 7: Commit the implementation**

```bash
git add content.js tests/e2e/extension.spec.js docs/superpowers/specs/2026-08-03-batch-phone-receiving-state-design.md docs/superpowers/plans/2026-08-03-batch-phone-receiving-state.md
git commit -m "Center batch phone receiving state"
```

### Task 2: Mark successfully uploaded phone rows

**Files:**
- Modify: `quick-vint-api/src/pages/__tests__/phoneUploadHtml.test.ts`
- Modify: `quick-vint-api/src/pages/phone-upload.html:362-370`
- Modify: `quick-vint-api/src/pages/phone-upload.html:700-716`

**Interfaces:**
- Consumes: the existing `item.done` success branch and `.remove-photo` button.
- Produces: `.upload-complete` presentation with accessible label `Photo uploaded`.

- [x] **Step 1: Add the failing page-contract assertion**

Extend the existing v2 review test to require the success branch to set `removeBtn.textContent = '✓'`, add `upload-complete`, and set `aria-label` to `Photo uploaded`.

- [x] **Step 2: Run the focused test and verify the new assertion fails**

Run `npm test -- src/pages/__tests__/phoneUploadHtml.test.ts`.

Expected: one failure because the upload-success branch does not yet update the remove button.

- [x] **Step 3: Add the minimal success presentation**

In the existing successful `xhr.onload` branch, after setting `item.done = true`, select that row's `.remove-photo`, replace × with ✓, add `upload-complete`, and set `aria-label="Photo uploaded"`. Add scoped green border, background, and text styles for `.remove-photo.upload-complete`.

- [x] **Step 4: Run the focused test and complete backend gate**

Run `npm test -- src/pages/__tests__/phoneUploadHtml.test.ts`, then `npm run verify:production`.

Expected: the focused contract and complete backend production gate pass.
