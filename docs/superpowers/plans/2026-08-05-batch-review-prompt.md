# Batch Review Prompt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a polished Chrome Web Store review prompt in the final generated tab after a successful batch.

**Architecture:** The background batch loop remembers the latest work tab and sends it one dedicated success message only after the whole batch completes. The existing content script owns the modal and per-user `chrome.storage.local` state; the existing design-system runtime sends the same message for an isolated admin preview.

**Tech Stack:** Chrome Extensions MV3 APIs, vanilla JavaScript, DOM/CSS, Node's built-in test runner.

## Global Constraints

- Show only after a successful batch, in the final generated tab.
- `Leave an honest review` permanently suppresses the prompt.
- `Not now`, close, backdrop, and Escape suppress it for seven days.
- Use the public Chrome Web Store reviews URL.
- Reuse existing content-script storage, analytics, modal, and admin-preview patterns.
- Add no dependency and run no broad test suite during preview work.

---

### Task 1: Final-tab success message and review modal

**Files:**
- Modify: `background.js`
- Modify: `content.js`
- Create: `test/batch-review-prompt.test.js`

**Interfaces:**
- Consumes: successful completion of `runBatchGenerationJob(job)` and `getPerUserStorageKey(prefix)`.
- Produces: `{ type: "SHOW_BATCH_REVIEW_PROMPT", total: number }` and `showBatchReviewPrompt({ total, force?: boolean }): Promise<boolean>`.

- [ ] **Step 1: Add the focused failing check**

Create a Node test which reads `background.js` and `content.js` and asserts that the background sends `SHOW_BATCH_REVIEW_PROMPT` to `lastWorkTabId`, the prompt defines `7 * 24 * 60 * 60 * 1000`, and the content listener routes the message to `showBatchReviewPrompt`.

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const background = fs.readFileSync(path.join(root, "background.js"), "utf8");
const content = fs.readFileSync(path.join(root, "content.js"), "utf8");

test("successful batches offer a review in the final generated tab", () => {
  assert.match(background, /lastWorkTabId[\s\S]*SHOW_BATCH_REVIEW_PROMPT/);
  assert.match(content, /BATCH_REVIEW_SNOOZE_MS\s*=\s*7\s*\*\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
  assert.match(content, /SHOW_BATCH_REVIEW_PROMPT[\s\S]*showBatchReviewPrompt/);
});
```

- [ ] **Step 2: Run the check and confirm it fails**

Run: `node --test test/batch-review-prompt.test.js`

Expected: FAIL because the final-tab message and modal do not exist.

- [ ] **Step 3: Send the success message to the final work tab**

In `runBatchGenerationJob`, remember each successful `workTab.id`. After cleanup and the existing `done` notification, send the dedicated message without turning a prompt-delivery failure into a failed batch.

```js
let lastWorkTabId = null;
// after RUN_BATCH_ITEM succeeds
lastWorkTabId = workTab.id;
// after the existing done notification
if (lastWorkTabId) {
  sendTabMessage(lastWorkTabId, {
    type: "SHOW_BATCH_REVIEW_PROMPT",
    total: groups.length,
  }).catch((error) => console.debug("Batch review prompt unavailable:", error));
}
```

- [ ] **Step 4: Add the modal and persistence in the content script**

Add `BATCH_REVIEW_MODAL_ID`, storage prefixes, the seven-day constant, and the Chrome Web Store reviews URL. Implement `showBatchReviewPrompt` using the existing per-user key helper:

```js
const stateKey = await getPerUserStorageKey(BATCH_REVIEW_STATE_KEY_PREFIX);
const state = (await chrome.storage.local.get(stateKey))[stateKey] || {};
if (!force && (state.reviewOpened || Date.now() - Number(state.snoozedAt || 0) < BATCH_REVIEW_SNOOZE_MS)) return false;
```

Render one accessible centered dialog with the approved copy and actions. The primary action opens the review URL in a new tab and stores `{ reviewOpened: true }`; every other close path stores `{ snoozedAt: Date.now() }`. Track shown, opened, and snoozed events. Route `SHOW_BATCH_REVIEW_PROMPT` through the existing runtime message listener.

- [ ] **Step 5: Run the focused check**

Run: `node --test test/batch-review-prompt.test.js`

Expected: PASS.

### Task 2: Admin content-components preview

**Files:**
- Modify: `design-system/content-runtime-review.js`

**Interfaces:**
- Consumes: `SHOW_BATCH_REVIEW_PROMPT` runtime message handled by real `content.js`.
- Produces: the `batch-review-prompt` admin scenario.

- [ ] **Step 1: Add the scenario**

Add an authenticated scenario with `action: "show-batch-review"`, a 640px frame, and verification for the approved title, copy, primary CTA, secondary CTA, and dialog role.

```js
{
  id: "batch-review-prompt",
  title: "Successful batch review prompt",
  note: "Review request shown in the final generated tab after a successful batch.",
  height: 640,
  auth: true,
  action: "show-batch-review",
  hasImages: true,
  verify(doc) {
    const modal = doc.getElementById("quickvint-batch-review-modal");
    const text = modal?.textContent || "";
    return modal?.getAttribute("role") === "dialog" &&
      /Impressive, isn’t it\?/.test(text) &&
      /Leave an honest review/.test(text) &&
      /Not now/.test(text);
  },
}
```

- [ ] **Step 2: Trigger the real content-script path**

Keep runtime-message listeners in a separate `runtimeListeners` array in the
preview mock. In `window.__runScenario`, call those listeners with
`{ type: "SHOW_BATCH_REVIEW_PROMPT", total: 8, force: true }` so preview
storage never hides the component.

- [ ] **Step 3: Run only the focused check and start the existing admin UI**

Run: `node --test test/batch-review-prompt.test.js`

Start the existing API/site dev server and inspect `/ui-components/content-components`. Do not run the full frontend or E2E suites yet.
