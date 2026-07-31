# Phone Credit Check Placement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Check listing capacity on the initial Phone click and reuse that result after the user chooses single or batch upload.

**Architecture:** Keep the existing chooser and capacity API. Move the existing request and blocked-state handling into `openUploadChoiceModal()`, then pass the successful response into the selected upload handler so neither option performs a second request.

**Tech Stack:** Chrome Extension Manifest V3 content script and Playwright E2E tests.

## Global Constraints

- Preserve the existing paywall, error copy, and server-side generation enforcement.
- Add no dependency or new state cache.
- Make no unrelated UI changes.

---

### Task 1: Move the Capacity Gate

**Files:**
- Modify: `content.js` (`openUploadChoiceModal`, `onPhoneUploadClick`, `onBatchUploadClick`)
- Test: `tests/e2e/extension.spec.js`

**Interfaces:**
- Consumes: `fetchBatchGenerationCapacity()` and `showBatchCapacityBlocked(capacity)`.
- Produces: `onPhoneUploadClick(capacity)` and `onBatchUploadClick(capacity)`, which reuse the successful first-click result.

- [ ] **Step 1: Write the failing browser test**

Update the blocked-capacity test to click `#quickvint-phone-btn` directly and assert that the chooser and QR modal never appear. Add an allowed-capacity assertion that counts `GET_BATCH_CAPACITY` messages before and after selecting each upload mode:

```js
const capacityRequestCount = () =>
  page.evaluate(() =>
    window.__extensionHarness.runtimeMessages.filter(
      (message) => message?.type === "GET_BATCH_CAPACITY",
    ).length,
  );

await page.locator("#quickvint-phone-btn").click();
await expect(page.locator("#quickvint-upload-choice-modal")).toBeVisible();
expect(await capacityRequestCount()).toBe(1);
await page.locator(".quickvint-upload-choice-single").click();
expect(await capacityRequestCount()).toBe(1);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "checks capacity on the first Phone click"
```

Expected: FAIL because the chooser currently opens before the request and the selected option performs the request.

- [ ] **Step 3: Move the existing capacity logic**

In `openUploadChoiceModal()`, set the Phone button to `Checking...`, fetch capacity, restore the button, and call `showBatchCapacityBlocked()` before returning when unavailable. Capture the successful response in the existing choice listeners and pass it to the corresponding handler. Remove the duplicate request blocks from `onPhoneUploadClick(capacity)` and `onBatchUploadClick(capacity)`; assign the supplied batch response to `batchGenerationCapacity` before opening the batch source screen.

- [ ] **Step 4: Run focused and full verification**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "Phone click|phone upload chooser|blocks phone upload"
npm test
npm run build:prod
git diff --check
```

Expected: all commands pass.

- [ ] **Step 5: Commit**

```bash
git add content.js tests/e2e/extension.spec.js
git commit -m "Check phone capacity before upload choice"
```
