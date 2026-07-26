# Sticky Unsorted Row Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep unresolved photos visible and visually stable while grouped items scroll.

**Architecture:** Reuse the existing batch gallery and grouping state. Make it an always-sticky, single horizontal row while unresolved photos remain, reconcile unresolved tile visibility from canonical grouping state, and cover the behavior with browser interaction and visual tests.

**Tech Stack:** Vanilla JavaScript/CSS, Playwright.

## Global Constraints

- Do not create a second photo gallery or duplicate photo state.
- Show four photos at once on desktop and three on screens up to 560px.
- Keep all additional unresolved photos accessible through native horizontal scrolling.
- Preserve existing batch blocking, selection, grouping, removal, and generation behavior.
- Add no dependencies.

---

### Task 1: Sticky-row behavior and visual coverage

**Files:**
- Modify: `content.js`
- Modify: `tests/e2e/extension.spec.js`
- Create: `tests/e2e/extension.spec.js-snapshots/batch-sticky-unsorted-row-desktop-linux.png`
- Create: `tests/e2e/extension.spec.js-snapshots/batch-sticky-unsorted-row-mobile-linux.png`

**Interfaces:**
- Consumes: `batchRemoteFiles`, `batchMarkedGroups`, `batchPhotoTileByKey`, and `.batch-gallery`.
- Produces: `.is-sticky-row` on the existing gallery whenever `remainingCount` is greater than zero.

- [ ] **Step 1: Write the failing Playwright test**

Add one test that opens a fifteen-photo batch, groups six photos, scrolls three
grouped item cards, and verifies that the nine-photo unresolved gallery remains
sticky with native horizontal overflow. Force an unresolved wrapper into stale
hidden state and verify it becomes visible again. Capture desktop and
390px-wide mobile viewports.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "keeps the unsorted row visible while grouped items scroll"
```

Expected: failure because `.is-sticky-row` is absent.

- [ ] **Step 3: Implement the minimal behavior**

In `updateBatchGroupingControls()`:

```js
gallery.classList.toggle(
  "is-sticky-row",
  remainingCount > 0,
);
```

Also iterate unresolved entries in `batchPhotoTileByKey`, cancel any stale hide
timer, remove grouped presentation, set `hidden = false`, and restore
`aria-hidden="false"`.

Add `.batch-gallery.is-sticky-row` CSS that makes the existing gallery a
single-row sticky tray with four desktop or three mobile slots, native
horizontal scrolling, a solid background, and subtle separation from grouped
cards. Keep `.is-empty` behavior unchanged.

- [ ] **Step 4: Generate and inspect visual baselines**

Run the focused test with `--update-snapshots`, then inspect both generated PNG
files. Confirm:

- no modal/header/footer overlap;
- no clipped thumbnails;
- no excessive empty block;
- grouped cards remain readable below the tray;
- desktop and 390px layouts each fit one row with intentional gallery-only
  horizontal overflow.

- [ ] **Step 5: Verify GREEN and full confidence**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "keeps the unsorted row visible while grouped items scroll"
npm test
npm run build:prod
```

Expected: focused test passes, all test suites pass, and the production build
exits successfully.

- [ ] **Step 6: Commit**

```bash
git add content.js tests/e2e/extension.spec.js tests/e2e/extension.spec.js-snapshots
git commit -m "fix: keep unsorted photos visible"
```
