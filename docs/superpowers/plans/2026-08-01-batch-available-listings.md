# Batch Available Listings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show one unified available-listings total in the upload chooser and throughout batch setup without exposing its daily, monthly, or extra-credit components.

**Architecture:** Reuse the `capacity.available` result already fetched by `openUploadChoiceModal()` and passed into `onBatchUploadClick(capacity)`. Render that value in the chooser and persistent batch heading, then let the existing organization-phase refresh update the heading and contextual capacity note.

**Tech Stack:** Chrome Extension Manifest V3 content script, vanilla DOM/CSS, Playwright E2E tests.

## Global Constraints

- Display only the unified `capacity.available` number.
- Use `available now` language; never call the number a credit balance.
- Do not display daily, monthly, free-lifetime, or pack-credit values.
- Do not add another capacity request when the user selects Multiple items.
- Preserve existing blocked-capacity, paywall, failure, limited-generation, responsive-layout, and accessibility behavior.
- Add no dependency and no new persistent cache.

---

### Task 1: Display Unified Availability Through the Batch Flow

**Files:**
- Modify: `content.js:4672-4869` (chooser styles)
- Modify: `content.js:5228-5276` and `content.js:6581-6626` (batch styles)
- Modify: `content.js:9162-9255` (chooser markup)
- Modify: `content.js:12748-12811` (batch modal markup)
- Modify: `content.js:13684-13930` (capacity refresh and organization copy)
- Test: `tests/e2e/extension.spec.js`

**Interfaces:**
- Consumes: the existing capacity shape `{ allowed: boolean, available: number, message?: string }` returned by `fetchBatchGenerationCapacity()`.
- Produces: `.quickvint-upload-choice-capacity`, `.batch-availability`, and updated `.batch-capacity-note` text.

- [ ] **Step 1: Write the failing browser coverage**

Teach the test harness to accept a sequence of capacity responses so the first
Phone click can return `12` and the existing organization refresh can return
`2`:

```js
const capacityQueue = Array.isArray(capacity) ? [...capacity] : [capacity];
let currentCapacity = capacityQueue[0] || null;

// Inside GET_BATCH_CAPACITY handling:
if (capacityQueue.length) currentCapacity = capacityQueue.shift();
response = { ok: true, capacity: currentCapacity };
```

Rename the chooser test to include `available listings`, then extend it with
the exact unified copy and negative assertions:

```js
await openContentHarness(page, { allowed: true, available: 12 });
const modal = await openPhoneChoice(page);
await expect(modal.locator(".quickvint-upload-choice-capacity")).toHaveText(
  "12 listings available now",
);
await expect(modal).not.toContainText(/daily|monthly|extra credit/i);
```

Add a focused flow test that proves the initial result is reused and the batch
heading remains visible:

```js
await openContentHarness(page, { allowed: true, available: 12 }, {
  emptyListing: true,
});
const chooser = await openPhoneChoice(page);
await chooser.locator(".quickvint-upload-choice-multiple").click();
const batch = page.locator("#quickvint-batch-modal");
await expect(batch.locator(".batch-availability")).toHaveText("12 available");
expect(await getCapacityRequestCount(page)).toBe(1);
await expect(batch).not.toContainText(/daily|monthly|extra credit/i);
```

Extend `setupReadyPhoneUploadWithDelayedThumbnails()` with an optional
`capacityResponse` argument and add organization coverage. With three uploaded
photos and capacity responses `12` then `2`, group each photo into its own item
and assert:

```js
await expect(batch.locator(".batch-availability")).toHaveText("2 available");
await expect(batch.locator(".batch-capacity-note")).toContainText(
  "You can generate 2 of 3 listings right now",
);
await expect(batch.locator(".batch-start")).toHaveText("Generate first 2 of 3");
```

Also use a stable capacity of `12`, create two groups, and assert the neutral
contextual copy:

```js
await expect(batch.locator(".batch-capacity-note")).toHaveText(
  "Using 2 of 12 available",
);
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "available listings|availability through|refreshed batch availability"
```

Expected: FAIL because the chooser and batch heading do not render availability
and the enough-capacity note is currently hidden.

- [ ] **Step 3: Add the minimal chooser and batch markup/styles**

In `openUploadChoiceModal()`, render the already-normalized `available` below
the title:

```html
<p class="quickvint-upload-choice-capacity">${available} listings available now</p>
```

Add a small neutral dot and muted type; do not make it a CTA or plan badge.

In `createBatchModal()`, add the persistent availability element beside the
title using `batchGenerationCapacity.available`:

```js
const available = Math.max(
  0,
  Math.floor(Number(batchGenerationCapacity?.available || 0)),
);

modal.innerHTML = `
<div class="batch-title-row">
  <h3 id="quickvint-batch-title" class="batch-title">Batch upload</h3>
  <span class="batch-availability" aria-live="polite">${available} available</span>
</div>
`;
```

Style `.batch-title-row` as a wrapping flex row and `.batch-availability` as a
compact neutral pill. Keep the existing close button and mobile dimensions.

- [ ] **Step 4: Update the existing capacity refresh renderer**

Inside `updateBatchGroupingControls()`, select `.batch-availability`. When a
positive current capacity exists, set it to `${available} available` and show
it. While loading or on failure, hide it so no stale number is presented.

When groups exist and `batchCapacityLoading` is true, show the existing
`.batch-capacity-note` with `Checking availability...`. Keep the current error
branch for a failed lookup. Replace the insufficient-capacity copy with:

```js
`You can generate ${available} of ${groups.length} listings right now. The first ${available} will be generated.`
```

Change only the final enough-capacity branch for `.batch-capacity-note`:

```js
capacityNote.classList.remove("is-hidden");
capacityNote.setAttribute("aria-hidden", "false");
capacityNote.textContent = `Using ${groups.length} of ${available} available`;
```

Leave the existing zero-capacity behavior unchanged.

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "available listings|availability through|refreshed batch availability"
```

Expected: all focused tests PASS.

- [ ] **Step 6: Run full verification**

Run:

```bash
npm test
npm run build:prod
git diff --check
```

Expected: all unit and browser tests pass, the production build exits `0`, and
`git diff --check` reports no whitespace errors.

- [ ] **Step 7: Commit**

```bash
git add content.js tests/e2e/extension.spec.js
git commit -m "Show available listings in batch flow"
```
