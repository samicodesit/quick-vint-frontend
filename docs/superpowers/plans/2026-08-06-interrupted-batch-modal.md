# Interrupted Batch Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the easy-to-miss bottom-right recovery nudge with the approved centered interruption modal on generated batch tabs.

**Architecture:** Keep the existing `SHOW_BATCH_RECOVERY_NUDGE` and `FOCUS_BATCH_RECOVERY` message flow unchanged. Replace only the nudge markup and CSS, add local dismissal, update the existing design-system scenario, and strengthen the existing browser regression test.

**Tech Stack:** Chrome MV3 content script, plain DOM/CSS, Playwright.

## Global Constraints

- Heading: `Your batch was interrupted`
- Body: `Your progress was saved. Return to the batch to continue with the remaining items.`
- Action: `Return to batch`
- Use a centered modal over a dimmed viewport with a slim indigo top accent.
- Place a small exclamation badge beside the heading; do not float it above the copy.
- Provide an accessible close × that removes only this tab's modal and never discards the saved batch.
- Preserve all existing recovery validation, controller focus/recreation, and zero Save/Publish behavior.
- Add no dependency or new recovery state.

---

### Task 1: Replace the work-tab nudge with the approved modal

**Files:**
- Modify: `content.js:11706-11754`
- Modify: `content.js:17796-17823`
- Modify: `design-system/content-runtime-review.js:31-49`
- Test: `tests/e2e/extension.spec.js:892-911`

**Interfaces:**
- Consumes: existing `SHOW_BATCH_RECOVERY_NUDGE` content message and `FOCUS_BATCH_RECOVERY` runtime request.
- Produces: one deduplicated `#quickvint-batch-recovery-nudge` viewport overlay whose primary button runs the existing focus request.

- [x] **Step 1: Strengthen the focused browser test so the old corner nudge fails**

Update `returns an interrupted work tab to its batch controller` to assert:

```js
await sendContentMessage(page, { type: "SHOW_BATCH_RECOVERY_NUDGE" });
await sendContentMessage(page, { type: "SHOW_BATCH_RECOVERY_NUDGE" });

const overlay = page.locator("#quickvint-batch-recovery-nudge");
await expect(overlay).toHaveCount(1);
await expect(overlay.getByRole("heading", { name: "Your batch was interrupted" })).toBeVisible();
await expect(overlay).toContainText(
  "Your progress was saved. Return to the batch to continue with the remaining items.",
);
await expect(overlay).toHaveCSS("position", "fixed");
await expect(overlay).toHaveCSS("inset", "0px");

await overlay.getByRole("button", { name: "Close" }).click();
await expect(overlay).toHaveCount(0);
await expect.poll(() => page.evaluate(() =>
  window.__extensionHarness.runtimeMessages.some(
    (message) => message.type === "DISCARD_BATCH_RECOVERY",
  ),
)).toBe(false);

await sendContentMessage(page, { type: "SHOW_BATCH_RECOVERY_NUDGE" });
await page.getByRole("button", { name: "Return to batch" }).click();
await expect.poll(() => page.evaluate(() =>
  window.__extensionHarness.runtimeMessages.some(
    (message) => message.type === "FOCUS_BATCH_RECOVERY",
  ),
)).toBe(true);
```

- [x] **Step 2: Run the focused test and confirm it fails against the old nudge**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js -g "returns an interrupted work tab"
```

Expected: failure because the old nudge has neither the approved heading/body nor a Close button and is not a full-viewport overlay.

- [x] **Step 3: Replace the nudge markup with the approved modal**

Keep `BATCH_RECOVERY_NUDGE_ID` and the current primary-button handler. Change `showBatchRecoveryNudge()` to render an overlay containing:

```html
<div class="quickvint-batch-recovery-dialog" role="alertdialog" aria-modal="true" aria-labelledby="quickvint-batch-recovery-title">
  <div class="quickvint-batch-recovery-accent"></div>
  <button class="quickvint-batch-recovery-close" type="button" aria-label="Close">×</button>
  <div class="quickvint-batch-recovery-content">
    <div class="quickvint-batch-recovery-heading">
      <span aria-hidden="true">!</span>
      <h2 id="quickvint-batch-recovery-title">Your batch was interrupted</h2>
    </div>
    <p>Your progress was saved. Return to the batch to continue with the remaining items.</p>
    <button class="quickvint-batch-recovery-return" type="button">Return to batch</button>
  </div>
</div>
```

The close handler is local and destructive-state-free:

```js
nudge.querySelector(".quickvint-batch-recovery-close")
  ?.addEventListener("click", () => nudge.remove());
```

Select the primary button by `.quickvint-batch-recovery-return`, preserve its existing disabled/`Opening…`/error behavior, append the overlay, then focus the Close button.

- [x] **Step 4: Replace the corner CSS with the approved centered treatment**

Style the outer ID as `position: fixed; inset: 0; display: grid; place-items: center; padding: 24px; background: rgba(35, 33, 63, .48);` with the existing maximum z-index. Style the inner panel at `width: min(430px, 100%)`, white, 18px radius, slim indigo gradient accent, strong shadow, and the approved spacing. Keep a visible `:focus-visible` outline and responsive text wrapping; do not add animation or another UI component.

- [x] **Step 5: Update the existing components-preview verification**

Change the `batch-recovery-nudge` scenario verification to require the approved heading, body, and action:

```js
return (
  /Your batch was interrupted/.test(nudge?.textContent || "") &&
  /Your progress was saved\. Return to the batch to continue with the remaining items\./.test(nudge?.textContent || "") &&
  /Return to batch/.test(nudge?.textContent || "")
);
```

Keep the scenario action and ID unchanged so the preview continues exercising the real content-script component.

- [x] **Step 6: Run the focused checks**

Run:

```bash
node --check content.js
npx playwright test tests/e2e/extension.spec.js -g "returns an interrupted work tab"
```

Expected: syntax check exits 0 and the focused Playwright test passes.

- [x] **Step 7: Commit the implementation**

```bash
git add content.js design-system/content-runtime-review.js tests/e2e/extension.spec.js
git commit -m "Show interrupted batch recovery prominently"
```
