# Wardrobe Bulk Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the owner-only wardrobe widget into a quota-aware bulk rewrite workflow with selectable wardrobe items, sequential edit tabs, replace/review modes, and per-field undo without automatically saving Vinted changes.

**Architecture:** Extend the current vanilla content script and background worker. Reuse the existing capacity endpoint, generation function, language preferences, tab-load/message helpers, and one-job guard; keep wardrobe DOM state, messages, progress, suggestions, and undo isolated from photo batch state. Each selected listing opens in its own inactive Vinted edit tab and remains open for the seller to inspect and save manually.

**Tech Stack:** Manifest V3 Chrome extension, vanilla DOM/CSS, `chrome.storage.local`, `chrome.tabs`, Playwright, Node test runner.

## Global Constraints

- Never click Vinted's Save, Update, Publish, Hide, or Delete controls.
- Reuse `GET_BATCH_CAPACITY` as the only source for unified available listings.
- Do not expose daily, monthly, free-lifetime, or pack-credit accounting.
- Preserve current `BATCH_PING`, `RUN_BATCH_ITEM`, `BATCH_PROGRESS`, phone upload, computer batch, manual generation, and description-prompt behavior.
- Wardrobe selection, messages, progress, suggestions, and undo use `quickvint-wardrobe-*` DOM names and `WARDROBE_REWRITE_*` message names.
- Batch and wardrobe jobs share one active-job lock but never share flow-specific arrays, modal state, upload sessions, or captured files.
- Use backend `generationMode: "batch"` for the existing API contract and separate frontend telemetry mode `wardrobe_rewrite`.
- Active and Hidden wardrobe items are eligible; Sold and malformed items are not.
- Selection never exceeds the latest positive `capacity.available` value.
- The widget keeps its existing 176px desktop and 148px narrow expanded heights through intro, preference, and selection states.
- Honor `prefers-reduced-motion: reduce`, keyboard access, visible focus, touch targets, and no-horizontal-overflow requirements.
- Add no dependency, framework, permission, backend endpoint, backend queue, or content script.
- Use TDD for each behavior slice and commit after every green task.

---

### Task 1: Docked Capacity Badge and Real CTA

**Files:**
- Modify: `content.js:20-30` (wardrobe constants/state)
- Modify: `content.js:9360-9635` (wardrobe shell, badge, and CTA styles)
- Modify: `content.js:15981-16213` (widget mount and capacity rendering)
- Modify: `tests/e2e/extension.spec.js:317-405` (wardrobe harness)
- Modify: `tests/e2e/extension.spec.js:5791-6045` (wardrobe tests)

**Interfaces:**
- Consumes: existing `sendMessage({ type: "GET_BATCH_CAPACITY" })` response `{ ok, capacity: { allowed, available, message, reason, tier } }`.
- Produces: `loadWardrobeRewriteCapacity() -> Promise<object>`, `renderWardrobeRewriteCapacity(shell, state)`, `.quickvint-wardrobe-rewrite-shell`, `.quickvint-wardrobe-rewrite-capacity`, and an enabled `.quickvint-wardrobe-rewrite-cta`.

- [ ] **Step 1: Extend the wardrobe fixture with capacity and authentication inputs**

Change the helper signature and installation call so widget tests can drive the
same capacity message used by batch:

```js
async function openWardrobeHarness(page, {
  profileId = "270830120",
  currentUserId = "270830120",
  login = false,
  follow = false,
  collapsed = false,
  extraBadges = false,
  capacityResponse = { allowed: true, available: 12 },
  signedIn = true,
} = {}) {
  // Existing fixture body remains.
  await page.goto(profileUrl, { waitUntil: "domcontentloaded" });
  await installChromeHarness(page, capacityResponse, {
    quickvintWardrobeRewriteCollapsed: collapsed,
    ...(signedIn ? { supabaseSession: { access_token: "token" } } : {}),
  });
  await page.addScriptTag({ path: languageDefaultsPath });
  await page.addScriptTag({ path: contentScriptPath });
}
```

Teach the existing `GET_BATCH_CAPACITY` harness branch to accept a complete
runtime error response without changing normal capacity fixtures:

```js
if (message?.type === "GET_BATCH_CAPACITY") {
  if (capacityQueue.length) currentCapacity = capacityQueue.shift();
  response = currentCapacity?.runtimeError
    ? { ok: false, error: currentCapacity.runtimeError }
    : { ok: true, capacity: currentCapacity };
}
```

- [ ] **Step 2: Add failing capacity and CTA browser tests**

Add focused tests that assert:

```js
test("docks unified availability above the wardrobe rewrite widget", async ({ page }) => {
  await openWardrobeHarness(page, {
    capacityResponse: { allowed: true, available: 12 },
  });
  const shell = page.locator(".quickvint-wardrobe-rewrite-shell");
  await expect(shell.locator(".quickvint-wardrobe-rewrite-capacity")).toHaveText(
    "12 listings available",
  );
  await expect(shell.locator(".quickvint-wardrobe-rewrite-cta")).toBeEnabled();
  await expect(shell).not.toContainText(/daily|monthly|credit/i);
});

test("retries a failed wardrobe capacity lookup without showing a stale number", async ({ page }) => {
  await openWardrobeHarness(page, {
    capacityResponse: [
      { runtimeError: "Connection issue." },
      { allowed: true, available: 8 },
    ],
  });
  await expect(page.locator(".quickvint-wardrobe-rewrite-capacity")).toContainText(
    "Availability unavailable",
  );
  await expect(page.locator(".quickvint-wardrobe-rewrite-capacity")).not.toContainText(/\d+ listings?/);
  await page.locator(".quickvint-wardrobe-rewrite-capacity-retry").click();
  await expect(page.locator(".quickvint-wardrobe-rewrite-capacity")).toHaveText(
    "8 listings available",
  );
});
```

Also cover singular `1 listing available`, `0 listings available`, signed-out
copy, Retry, a minimum 40px CTA height, focus visibility, collapsed placement,
and unchanged card height at desktop and 390px.

- [ ] **Step 3: Run the focused tests and verify RED**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "wardrobe.*availability|capacity.*wardrobe|real wardrobe rewrite CTA"
```

Expected: FAIL because the widget has no capacity shell and its CTA is disabled.

- [ ] **Step 4: Add the minimal shell, fetcher, renderer, and CTA state**

Add state:

```js
let wardrobeRewriteCapacity = null;
let wardrobeRewriteCapacityLoading = false;
```

Add a fetcher that normalizes only the shared actionable fields:

```js
async function loadWardrobeRewriteCapacity() {
  wardrobeRewriteCapacityLoading = true;
  wardrobeRewriteCapacity = null;
  try {
    const response = await sendMessage({ type: "GET_BATCH_CAPACITY" });
    if (!response?.ok) throw new Error(response?.error || "Availability unavailable");
    const capacity = response.capacity || {};
    wardrobeRewriteCapacity = {
      allowed: Boolean(capacity.allowed),
      available: Math.max(0, Math.floor(Number(capacity.available || 0))),
      message: String(capacity.message || ""),
      reason: capacity.reason || null,
      tier: capacity.tier || null,
    };
    return wardrobeRewriteCapacity;
  } catch (error) {
    wardrobeRewriteCapacity = {
      allowed: false,
      available: 0,
      error: error?.message || "Availability unavailable",
    };
    return wardrobeRewriteCapacity;
  } finally {
    wardrobeRewriteCapacityLoading = false;
  }
}
```

Wrap the existing aside in `.quickvint-wardrobe-rewrite-shell`, add the docked
badge before it, and move wide-grid sizing to the shell. The card retains its
existing ID and dimensions. Render exact loading/positive/zero/signed-out/error
states and a Retry button on lookup error. Set CTA `type="button"`, remove
`disabled` from static markup, remove opacity blur, use `cursor: pointer`, and
disable it only during unresolved capacity. Reuse `openSignInPopup()` and
`showBatchCapacityBlocked()` for signed-out and zero-capacity clicks.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run the Step 3 command. Expected: all focused capacity/CTA tests PASS.

- [ ] **Step 6: Run existing wardrobe regression tests**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "own wardrobe rewrite widget"
```

Expected: all previous owner, motion, collapse, responsive, and guard tests PASS.

- [ ] **Step 7: Commit**

```bash
git add content.js tests/e2e/extension.spec.js
git commit -m "Add wardrobe rewrite capacity badge"
```

---

### Task 2: Fixed-Size Preference Wizard

**Files:**
- Modify: `content.js:9360-9635` (wizard styles)
- Modify: `content.js:16060-16213` (widget state and events)
- Modify: `tests/e2e/extension.spec.js:5791-6045`

**Interfaces:**
- Consumes: positive `wardrobeRewriteCapacity` and existing widget collapse functions.
- Produces: `setWardrobeRewriteStep(step)`, `wardrobeRewriteApplyMode: "replace" | "review" | null`, `.quickvint-wardrobe-rewrite-intro`, `.quickvint-wardrobe-rewrite-preference`, and `.quickvint-wardrobe-rewrite-instruction`.

- [ ] **Step 1: Add failing wizard tests**

Add tests for stable geometry and real form semantics:

```js
test("asks how generated wardrobe copy should be handled without resizing", async ({ page }) => {
  await openWardrobeHarness(page);
  const widget = page.locator("#quickvint-wardrobe-rewrite-widget");
  const before = await widget.boundingBox();
  await page.locator(".quickvint-wardrobe-rewrite-cta").click();
  await expect(page.getByText("How should generated copy be handled?")).toBeVisible();
  await expect(page.locator('input[name="quickvint-wardrobe-apply-mode"]')).toHaveCount(2);
  await expect(page.locator(".quickvint-wardrobe-rewrite-continue")).toBeDisabled();
  await page.getByLabel("Review first").check();
  await expect(page.locator(".quickvint-wardrobe-rewrite-continue")).toBeEnabled();
  const after = await widget.boundingBox();
  expect(after.height).toBe(before.height);
  expect(after.width).toBe(before.width);
});
```

Add Back, Replace, Review, Continue, Exit selection, collapse-unavailable,
narrow 148px height, keyboard navigation, and reduced-motion cases.

- [ ] **Step 2: Run wizard tests and verify RED**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "generated wardrobe copy|wardrobe preference|selection instruction"
```

Expected: FAIL because CTA has no workflow and the additional views do not exist.

- [ ] **Step 3: Implement the three widget views and state transition**

Keep all views inside the existing aside:

```html
<div class="quickvint-wardrobe-rewrite-intro">...</div>
<form class="quickvint-wardrobe-rewrite-preference" hidden>
  <fieldset>
    <legend>How should generated copy be handled?</legend>
    <label><input type="radio" name="quickvint-wardrobe-apply-mode" value="replace"> Replace fields</label>
    <label><input type="radio" name="quickvint-wardrobe-apply-mode" value="review"> Review first</label>
  </fieldset>
  <button type="button" class="quickvint-wardrobe-rewrite-back">Back</button>
  <button type="submit" class="quickvint-wardrobe-rewrite-continue" disabled>Continue</button>
</form>
<div class="quickvint-wardrobe-rewrite-instruction" hidden>
  <h2>Select listings below</h2>
  <p class="quickvint-wardrobe-rewrite-mode-copy"></p>
  <button type="button" class="quickvint-wardrobe-rewrite-exit">Exit selection</button>
</div>
```

Implement `setWardrobeRewriteStep("intro" | "preference" | "selection")` by
toggling `hidden` and one state class. Radio changes set
`wardrobeRewriteApplyMode`; submit calls `startWardrobeSelection()` introduced
in Task 3. Back restores intro. While state is not intro, hide/disable collapse
controls without altering persisted collapse preference.

- [ ] **Step 4: Run wizard tests and verify GREEN**

Run the Step 2 command. Expected: all wizard tests PASS.

- [ ] **Step 5: Run wardrobe regression tests**

Run the Task 1 Step 6 command. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add content.js tests/e2e/extension.spec.js
git commit -m "Add wardrobe rewrite preference step"
```

---

### Task 3: Wardrobe Item Selection and Sticky Controller

**Files:**
- Modify: `content.js:20-40` (selection state)
- Modify: `content.js:9360-9635` (selection overlays, pulse, toolbar, responsive styles)
- Modify: `content.js:15981-16230` (item parsing, selection lifecycle, language, start/cancel)
- Modify: `tests/e2e/extension.spec.js:317-405` (product-grid fixture)
- Modify: `tests/e2e/extension.spec.js:5791-6100` (selection tests)

**Interfaces:**
- Consumes: approved `wardrobeRewriteApplyMode`, current `wardrobeRewriteCapacity`, `LANGUAGE_OPTIONS`, `resolveLanguageProfile()`, and `loadWardrobeRewriteCapacity()`.
- Produces: `readWardrobeListingCard(gridItem) -> { id, itemUrl, editUrl, status, gridItem, image } | null`, `startWardrobeSelection()`, `stopWardrobeSelection()`, `renderWardrobeSelectionController()`, `wardrobeRewriteSelectedItems: Map`, and `START_WARDROBE_REWRITE` payloads.

- [ ] **Step 1: Add the supplied wardrobe DOM to the fixture**

Add a helper that reproduces the stable contract from the attached HTML:

```js
function wardrobeItemFixture({ id, status = "", title = `Item ${id}` }) {
  return `<div data-testid="grid-item">
    <div data-testid="product-item-id-${id}">
      <div class="new-item-box__image-container">
        <div data-testid="product-item-id-${id}--image">
          <img data-testid="product-item-id-${id}--image--img" alt="${title}" src="https://images1.vinted.net/${id}.webp">
        </div>
        <a data-testid="product-item-id-${id}--overlay-link" href="/items/${id}"></a>
        ${status ? `<div data-testid="product-item-id-${id}--status"><p data-testid="product-item-id-${id}--status-text">${status}</p></div>` : ""}
      </div>
    </div>
  </div>`;
}
```

Render active, Hidden, and Sold examples followed by
`<div data-testid="infinite-scroll"></div>`.

- [ ] **Step 2: Add failing eligibility, selection, and cleanup tests**

Cover exact behavior:

```js
test("selects active and hidden wardrobe items but excludes sold items", async ({ page }) => {
  await openWardrobeHarness(page, { capacityResponse: { allowed: true, available: 2 } });
  await enterWardrobeSelection(page, "review");
  await expect(page.locator(".quickvint-wardrobe-select-item")).toHaveCount(2);
  await page.getByRole("button", { name: /Select Item 9443601541/ }).click();
  await page.getByRole("button", { name: /Select Item 7563307251/ }).click();
  await expect(page.locator(".quickvint-wardrobe-selection-count")).toHaveText(
    "2 selected · 2 available",
  );
  await expect(page.locator('[data-testid="product-item-id-6361197692"] .quickvint-wardrobe-select-item')).toHaveCount(0);
});
```

Also test mismatched IDs, off-origin links, selection cap, unselect, keyboard
toggle, one attention animation, reduced motion, dynamic card decoration after
an infinite-scroll mutation, first-item scroll offset, Exit cleanup, pagehide
cleanup, and no navigation after clicking an overlay.

- [ ] **Step 3: Add failing sticky controller and start-payload tests**

Assert the controller is immediately before the feed grid, computes
`position: sticky`, includes two labeled language selects, keeps Start disabled
at zero selected, persists language changes to existing storage keys, and sends:

```js
expect(startMessage).toEqual({
  type: "START_WARDROBE_REWRITE",
  items: [
    { id: "9443601541", editUrl: "https://www.vinted.nl/items/9443601541/edit" },
  ],
  applyMode: "review",
  titleLanguageCode: "en",
  descriptionLanguageCode: "nl",
});
```

Queue capacity `2` at mount and `0` at Start; assert no start message is sent,
selection remains active, and the controller asks the user to deselect to the
new maximum.

- [ ] **Step 4: Run selection tests and verify RED**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "wardrobe item|wardrobe selection|wardrobe controller|dynamic wardrobe"
```

Expected: FAIL because no selection or controller behavior exists.

- [ ] **Step 5: Implement strict card parsing and selection lifecycle**

Parse only matching numeric contracts:

```js
function readWardrobeListingCard(gridItem) {
  const root = gridItem.querySelector('[data-testid^="product-item-id-"]');
  const id = root?.dataset.testid?.match(/^product-item-id-(\d+)$/)?.[1];
  const link = root?.querySelector('a[data-testid$="--overlay-link"][href]');
  const image = root?.querySelector(`[data-testid="product-item-id-${id}--image"]`);
  if (!id || !link || !image) return null;
  const url = new URL(link.href, location.origin);
  if (url.origin !== location.origin || url.pathname !== `/items/${id}`) return null;
  const status = root.querySelector('[data-testid$="--status-text"]')?.textContent?.trim().toLowerCase() || "active";
  if (status === "sold") return null;
  if (status !== "active" && status !== "hidden") return null;
  return {
    id,
    itemUrl: url.href,
    editUrl: `${location.origin}/items/${id}/edit`,
    status,
    gridItem,
    image,
  };
}
```

`startWardrobeSelection()` locates the first feed grid containing eligible
cards, decorates current cards, observes child-list mutations, inserts overlay
buttons, starts the one-shot pulse, inserts the controller, and scrolls with:

```js
const top = firstItem.getBoundingClientRect().top + scrollY - 96;
window.scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? "auto" : "smooth" });
```

Store selected records in a `Map` keyed by ID. Overlay buttons update
`aria-pressed`, check text, selected class, controller count, and selection-cap
disabled state. `stopWardrobeSelection()` disconnects the observer and removes
every prefixed node/class/listener.

- [ ] **Step 6: Implement the sticky controller and stable language payload**

Build options from the existing `LANGUAGE_OPTIONS`, initialize with:

```js
const storage = await chrome.storage.local.get([
  "selectedLanguage",
  "selectedTitleLanguage",
  "selectedDescriptionLanguage",
]);
const profile = resolveLanguageProfile(storage);
```

Persist explicit select changes to `selectedTitleLanguage` and
`selectedDescriptionLanguage`. Before Start, call
`loadWardrobeRewriteCapacity()`. If available is below the selected count, show
the exact new maximum and return. Otherwise capture selected records and send
the exact `START_WARDROBE_REWRITE` payload. Cancel calls
`stopWardrobeSelection()` and restores intro.

- [ ] **Step 7: Run selection tests and verify GREEN**

Run the Step 4 command. Expected: all selection/controller tests PASS.

- [ ] **Step 8: Run all wardrobe tests**

```bash
npx playwright test tests/e2e/extension.spec.js --grep "wardrobe"
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add content.js tests/e2e/extension.spec.js
git commit -m "Add wardrobe listing selection"
```

---

### Task 4: Shared Job Lock and Sequential Rewrite Tabs

**Files:**
- Modify: `background.js:50-70` (active job state)
- Modify: `background.js:480-760` (tab helpers and job runners)
- Modify: `background.js:1130-1160` (message dispatch)
- Create: `test/background-wardrobe-rewrite.test.js`

**Interfaces:**
- Consumes: `START_WARDROBE_REWRITE` payload from Task 3, existing `getBatchCapacity()`, `waitForTabComplete()`, `sendTabMessage()`, and `sleep()`.
- Produces: shared `activeTabJob`, `validateWardrobeRewriteRequest(message, sender, available)`, `waitForWardrobeRewriteTabReady(tabId, itemId)`, `runWardrobeRewriteJob(job)`, and `WARDROBE_REWRITE_PROGRESS` messages.

- [ ] **Step 1: Add a focused background test harness**

Create a Node test that executes `background.js` in a VM with deterministic
`chrome.tabs`, storage, runtime messaging, fetch, Supabase, and timer stubs. The
harness records `tabs.create`, `tabs.duplicate`, `tabs.sendMessage`, and source
progress messages. Use the existing `test/background-auth-handoff.test.js`
shape for `importScripts`, `vm.createContext`, and listener capture.

The default capacity fetch returns:

```js
new Response(JSON.stringify({ allowed: true, available: 3 }), {
  status: 200,
  headers: { "content-type": "application/json" },
});
```

- [ ] **Step 2: Add failing validation and flow-isolation tests**

Add tests that send the captured runtime listener messages and assert:

```js
await sendRuntimeMessage({
  type: "START_WARDROBE_REWRITE",
  items: [{ id: "42", editUrl: "https://www.vinted.nl/items/42/edit" }],
  applyMode: "review",
  titleLanguageCode: "en",
  descriptionLanguageCode: "nl",
}, { tab: { id: 7, url: "https://www.vinted.nl/member/9" } });

assert.deepEqual(createdTabs, [
  { url: "https://www.vinted.nl/items/42/edit", active: false },
]);
assert.equal(duplicatedTabs.length, 0);
assert.equal(sentToWorkTab.some(({ message }) => message.type === "RUN_BATCH_ITEM"), false);
```

Reject duplicate IDs, nonnumeric IDs, cross-origin URLs, wrong paths, mode
outside replace/review, unsupported language codes, more items than capacity,
and empty items. Assert an active batch rejects rewrite and an active rewrite
rejects batch without changing either job's messages.

- [ ] **Step 3: Add failing sequential readiness and progress tests**

Use two items. Make `WARDROBE_REWRITE_PING` return false once then true per tab,
and `RUN_WARDROBE_REWRITE_ITEM` resolve. Assert tabs are created one at a time,
the second starts after the first run resolves, and source progress status order
is:

```js
[
  "queued",
  "opening_tab",
  "tab_ready",
  "generating",
  "item_done",
  "opening_tab",
  "tab_ready",
  "generating",
  "item_done",
  "done",
]
```

Make the first run fail and assert no second tab opens, `failed` is reported,
and the first tab is not closed.

- [ ] **Step 4: Run the background test and verify RED**

Run:

```bash
node --test test/background-wardrobe-rewrite.test.js
```

Expected: FAIL because the wardrobe message/job contract does not exist.

- [ ] **Step 5: Replace the batch-only lock with one typed active lock**

Use:

```js
let activeTabJob = null;
```

Batch start rejects when any job exists, then stores
`{ kind: "batch", sourceTabId, sessionId, groups }`. Its runner receives the
same object and clears the lock only when `activeTabJob === job`. Do not alter
batch progress, tab duplication, photo injection, or cleanup behavior.

- [ ] **Step 6: Implement strict rewrite request validation**

Validate sender/source origin, unique numeric IDs, exact HTTPS edit URLs on the
same origin, supported `LANGUAGE_OPTIONS` codes represented in background as a
small constant `SUPPORTED_LANGUAGE_CODES`, apply mode, item count, and fresh
capacity. Return `{ ok: false, error }` before setting the lock on any failure.

- [ ] **Step 7: Implement the separate rewrite runner using shared low-level helpers**

Add `createInactiveTab(url)`, reuse `waitForTabComplete`, and poll:

```js
await sendTabMessage(tabId, {
  type: "WARDROBE_REWRITE_PING",
  itemId,
});
```

Send the work command:

```js
{
  type: "RUN_WARDROBE_REWRITE_ITEM",
  itemId,
  itemIndex,
  totalItems,
  applyMode,
  titleLanguageCode,
  descriptionLanguageCode,
}
```

Report progress only with `WARDROBE_REWRITE_PROGRESS`. Stop on first error,
leave tabs open, and clear only the matching active lock in `finally`.

- [ ] **Step 8: Run background tests and verify GREEN**

Run:

```bash
node --test test/background-wardrobe-rewrite.test.js test/background-auth-handoff.test.js
```

Expected: both test files PASS.

- [ ] **Step 9: Commit**

```bash
git add background.js test/background-wardrobe-rewrite.test.js
git commit -m "Add sequential wardrobe rewrite jobs"
```

---

### Task 5: Edit-Tab Generation, Replace, Review, and Undo

**Files:**
- Modify: `content.js:20-45` (result DOM constants and per-tab state)
- Modify: `content.js:3900-3930` (wardrobe runtime messages)
- Modify: `content.js:7400-7600` (result/suggestion styles near existing field prompts)
- Modify: `content.js:15150-15363` (readiness/status helpers and work-item runner)
- Modify: `content.js:15364-15830` (`generateCurrentListing` options and success handling)
- Modify: `tests/e2e/extension.spec.js:198-300` (edit-page fixture options)
- Modify: `tests/e2e/extension.spec.js:2536-3200` (generation and work-tab tests)
- Modify: `tests/e2e/extension.spec.js:5791-6200` (source progress tests)

**Interfaces:**
- Consumes: Task 4 messages, existing generation request builder, image discovery, and current callers.
- Produces: `generateCurrentListing({ applyGeneratedOutput, languageOverrides, telemetryMode, ... })`, `isWardrobeRewriteTabReady(itemId)`, `runWardrobeRewriteItem(message)`, `setListingFieldValue(field, value)`, `renderWardrobeReplaceUndo(originals, generated)`, and `renderWardrobeReviewSuggestions(originals, generated)`. `languageOverrides` is `{ titleLanguageCode, descriptionLanguageCode } | null`; existing generation defaults remain unchanged.

- [ ] **Step 1: Add failing readiness, no-apply, and language-override tests**

Send `WARDROBE_REWRITE_PING` through the content listener and assert `{ ok:
true, itemId }` only when the pathname is exactly `/items/<itemId>/edit`, both
fields exist, and `getUploadedImageEntries()` returns at least one image. Wrong
ID, new-listing route, absent field, and absent image return `{ ok: false }`.

After stubbing `/api/generate`, send `RUN_WARDROBE_REWRITE_ITEM` with
`applyMode: "review"`. Assert original inputs remain unchanged and the request
body contains:

```js
expect(generateBody).toMatchObject({
  titleLanguageCode: "fr",
  descriptionLanguageCode: "nl",
  generationMode: "batch",
});
```

Assert different stored language defaults remain unchanged. Extend the existing
manual generation test to prove a normal Generate click still fills both fields.

- [ ] **Step 2: Add failing replace and independent undo tests**

Start with `Original title` and `Original description`, stub generation as
`{ title: "New title", description: "New description" }`, and send:

```js
{
  type: "RUN_WARDROBE_REWRITE_ITEM",
  itemId: "42",
  itemIndex: 1,
  totalItems: 1,
  applyMode: "replace",
  titleLanguageCode: "en",
  descriptionLanguageCode: "nl",
}
```

Assert both fields change, no Vinted submit/save sentinel is clicked, and the
result bar has `Undo title` and `Undo description`. Undo title only and assert
description remains generated; then undo description.

- [ ] **Step 3: Add failing review/apply/reject/undo tests**

With `applyMode: "review"`, assert both fields remain original and two cards are
visible simultaneously. Verify independent behavior:

```js
await page.getByRole("button", { name: "Apply generated title" }).click();
await expect(titleInput).toHaveValue("New title");
await expect(descriptionInput).toHaveValue("Original description");
await page.getByRole("button", { name: "Reject generated description" }).click();
await expect(descriptionInput).toHaveValue("Original description");
await page.getByRole("button", { name: "Undo generated title" }).click();
await expect(titleInput).toHaveValue("Original title");
```

Also cover generation failure leaving both fields untouched, a second rewrite
replacing old controls/state, field-wrapper rerender reattachment, five-minute
observer cleanup, responsive layout, and no horizontal overflow.

Inject `WARDROBE_REWRITE_PROGRESS` through the captured listener and assert the
sticky controller shows `Rewriting 1 of 2`, then `2 listings ready`, or the
exact failure without creating `#quickvint-batch-modal`. Queue a lower capacity
after `done` and assert the docked badge refreshes to the new number.

- [ ] **Step 4: Run all edit-tab tests and verify RED**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "wardrobe rewrite tab|wardrobe replace|wardrobe review|wardrobe language overrides|wardrobe rewrite progress|generated title"
```

Expected: FAIL because the messages, narrow generation options, and result UIs
do not exist.

- [ ] **Step 5: Add narrow generation options with unchanged defaults**

Extend the signature:

```js
async function generateCurrentListing({
  descriptionApplyChoice = "replace",
  manageButtonState = true,
  showMeasurementAdvice = true,
  throwOnLimit = false,
  skipEmojiRetryPrompt = false,
  emojiRetry = false,
  overrideUseEmojis = null,
  generationMode = null,
  telemetryMode = null,
  applyGeneratedOutput = true,
  languageOverrides = null,
} = {})
```

Set frontend telemetry `mode` from `telemetryMode` first while keeping request
`generationMode` independent. Use validated overrides when present; otherwise
use `resolveLanguageProfile(storage)`. Apply fields, start output-edit tracking,
button success, and post-generation prompts only under their existing defaults
and when `applyGeneratedOutput` is true. Always return
`{ ok: true, title, description, measurementAdvice, offers }`.

- [ ] **Step 6: Add dedicated wardrobe messages and isolated runner**

Add sibling branches without changing batch branches:

```js
if (message?.type === "WARDROBE_REWRITE_PING") {
  const itemId = String(message.itemId || "");
  sendResponse({ ok: isWardrobeRewriteTabReady(itemId), itemId });
  return false;
}
if (message?.type === "RUN_WARDROBE_REWRITE_ITEM") {
  runWardrobeRewriteItem(message)
    .then(sendResponse)
    .catch((error) => sendResponse({
      ok: false,
      error: error?.message || "Wardrobe rewrite failed.",
    }));
  return true;
}
if (message?.type === "WARDROBE_REWRITE_PROGRESS") {
  handleWardrobeRewriteProgress(message);
  sendResponse({ ok: true });
  return false;
}
```

`runWardrobeRewriteItem()` validates readiness, captures originals, and calls:

```js
const generated = await generateCurrentListing({
  manageButtonState: false,
  showMeasurementAdvice: false,
  throwOnLimit: true,
  generationMode: "batch",
  telemetryMode: "wardrobe_rewrite",
  applyGeneratedOutput: false,
  languageOverrides: {
    titleLanguageCode: message.titleLanguageCode,
    descriptionLanguageCode: message.descriptionLanguageCode,
  },
});
```

Route complete output only to the requested renderer. Reuse one
`setListingFieldValue` helper for title, description, Apply, and Undo; it emits
bubbling `input` and `change` events. Never query or click non-prefixed buttons.

- [ ] **Step 7: Implement replace undo and review suggestion cards**

Replace mode inserts one result bar near the details card. Review mode inserts
one card after each field wrapper. Generated strings are assigned with
`textContent`. Each button closes over only its own field values. Applying
changes that card to Undo; rejecting removes only that card. A bounded observer
reattaches unresolved cards after Vinted rerenders and stops when both resolve,
after five minutes, or on `pagehide`.

- [ ] **Step 8: Run edit-tab tests and verify GREEN**

Run the Step 4 command. Expected: all edit-tab tests PASS.

- [ ] **Step 9: Run manual and photo-batch regressions**

```bash
npx playwright test tests/e2e/extension.spec.js --grep "generates listing copy|description apply|batch work tab|phone-upload files"
```

Expected: PASS with no wardrobe result UI outside a wardrobe message.

- [ ] **Step 10: Commit**

```bash
git add content.js tests/e2e/extension.spec.js
git commit -m "Add wardrobe rewrite review and undo"
```

---

### Task 6: End-to-End Integration, Full Verification, and Live Vinted Check

**Files:**
- Modify if a failing check requires it: `content.js`, `background.js`, `tests/e2e/extension.spec.js`, `test/background-wardrobe-rewrite.test.js`
- Create temporarily under workspace `tmp/`: live visual/DOM check script and screenshots; do not commit temporary artifacts.

**Interfaces:**
- Consumes: completed profile selection, background job, generation options, and edit-tab UI.
- Produces: verified end-to-end wardrobe rewrite behavior with unchanged existing flows.

- [ ] **Step 1: Add one loaded-MV3 extension integration test**

Use the existing loaded-extension test pattern to route an authenticated owner
profile, two item edit pages, capacity, and `/api/generate`. Select two items in
Review mode and assert the real background service worker opens edit tabs
sequentially, each work tab keeps original fields, each shows both suggestion
cards, and the profile controller ends with `2 listings ready`. Assert no
`#quickvint-batch-modal`, no photo injection, and no Vinted save click.

- [ ] **Step 2: Run the integration test and fix only root-cause failures**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "rewrites selected wardrobe listings through the loaded MV3 extension"
```

Expected: PASS. Any failure must be reproduced in the narrowest earlier test
before production code changes.

- [ ] **Step 3: Run all focused wardrobe checks**

```bash
node --test test/background-wardrobe-rewrite.test.js
npx playwright test tests/e2e/extension.spec.js --grep "wardrobe"
```

Expected: all background and browser wardrobe tests PASS.

- [ ] **Step 4: Run the complete frontend verification gate**

```bash
npm test
npm run build:prod
git diff --check
git status --short --branch
```

Expected: all unit and E2E tests pass, production minification succeeds, no
whitespace errors, and only intentional source/test changes or generated output
already tracked by the build remain.

- [ ] **Step 5: Run a live authenticated owner-profile DOM and visual check**

Use the user's authenticated Chromium profile and
`https://www.vinted.nl/member/270830120`. Confirm exact owner proof before
judging UI. At 1440px and 390px verify:

- badge docking and crisp CTA;
- stable widget dimensions through preference and instruction;
- real active and Hidden cards decorate while Sold cards do not;
- sticky controller and language controls remain readable;
- attention pulse and reduced-motion behavior;
- no overlap or horizontal overflow; and
- Cancel fully restores Vinted's DOM.

Start one controlled Review-mode item. Inspect the opened edit tab, verify both
suggestions and independent Apply/Reject/Undo, and stop without clicking
Vinted's Save/Update button. Do not use a sold listing or alter marketplace
state.

- [ ] **Step 6: Re-run the full gate after any live-check fix**

Run the Step 4 commands again. Expected: PASS.

- [ ] **Step 7: Commit final integration fixes**

If Task 6 required source or test fixes:

```bash
git add content.js background.js tests/e2e/extension.spec.js test/background-wardrobe-rewrite.test.js
git commit -m "Verify wardrobe bulk rewrite flow"
```

If no files changed, do not create an empty commit.

## Completion Audit

Before claiming completion, map each approved design requirement to evidence:

| Requirement | Evidence |
| --- | --- |
| Unified docked capacity badge | focused capacity tests + live screenshots |
| Crisp real CTA and fixed-size wizard | geometry/focus tests + live check |
| Active/Hidden selection; Sold exclusion | supplied-DOM fixture tests + live check |
| Purple attention/checkbox overlay | selection tests + reduced-motion test |
| Sticky controls, languages, Start/Cancel | controller tests + exact payload assertion |
| Sequential isolated tabs | background unit tests + loaded-MV3 integration |
| Replace title/description and undo | replace work-tab test |
| Review title/description independently | review Apply/Reject/Undo test |
| No automatic Vinted save | click sentinel in work-tab and MV3 tests + live procedure |
| No batch cross-contamination | shared-lock tests + absence of batch messages/DOM |
| Existing flows unchanged | full `npm test` + production build |

Do not mark the feature complete if any row lacks its stated evidence.
