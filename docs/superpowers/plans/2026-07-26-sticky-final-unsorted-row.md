# Sticky Final Unsorted Row Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the final unresolved photo row visible and visually stable until every photo is grouped or removed.

**Architecture:** Reuse the existing batch gallery and grouping state. Add one responsive final-row class, reconcile unresolved tile visibility from canonical grouping state, and cover the behavior with a browser interaction test plus desktop and narrow screenshots.

**Tech Stack:** Vanilla JavaScript/CSS, Playwright.

## Global Constraints

- Do not create a second photo gallery or duplicate photo state.
- Preserve the current multi-row grid while more than one row remains.
- Use four photos as the desktop final-row threshold and three on screens up to 560px.
- Preserve existing batch blocking, selection, grouping, removal, and generation behavior.
- Add no dependencies.

---

### Task 1: Final-row behavior and visual coverage

**Files:**
- Modify: `content.js`
- Modify: `tests/e2e/extension.spec.js`
- Create: `tests/e2e/extension.spec.js-snapshots/batch-final-unsorted-row-desktop-chromium-linux.png`
- Create: `tests/e2e/extension.spec.js-snapshots/batch-final-unsorted-row-mobile-chromium-linux.png`

**Interfaces:**
- Consumes: `batchRemoteFiles`, `batchMarkedGroups`, `batchPhotoTileByKey`, and `.batch-gallery`.
- Produces: `.is-final-row` on the existing gallery when `remainingCount` is within the responsive row threshold.

- [ ] **Step 1: Write the failing Playwright test**

Add one test that opens a five-photo batch, verifies the gallery is initially
not final-row, groups enough photos to leave one responsive row, verifies
`.is-final-row`, forces an unresolved wrapper into stale hidden state, triggers
a grouping-control update through selection, and verifies that wrapper becomes
visible again. Capture the modal at desktop and 390px-wide mobile viewports.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "keeps the final unsorted row visible"
```

Expected: failure because `.is-final-row` is absent and stale hidden state is
not reconciled.

- [ ] **Step 3: Implement the minimal behavior**

In `updateBatchGroupingControls()`:

```js
const finalRowLimit = window.matchMedia("(max-width: 560px)").matches ? 3 : 4;
gallery.classList.toggle(
  "is-final-row",
  remainingCount > 0 && remainingCount <= finalRowLimit,
);
```

Also iterate unresolved entries in `batchPhotoTileByKey`, cancel any stale hide
timer, remove grouped presentation, set `hidden = false`, and restore
`aria-hidden="false"`.

Add `.batch-gallery.is-final-row` CSS that makes the existing gallery a compact
single-row sticky tray with a solid background and subtle separation from the
scrolling item cards. Keep `.is-empty` behavior unchanged.

- [ ] **Step 4: Generate and inspect visual baselines**

Run the focused test with `--update-snapshots`, then inspect both generated PNG
files. Confirm:

- no modal/header/footer overlap;
- no clipped thumbnails;
- no excessive empty block;
- grouped cards remain readable below the tray;
- desktop and 390px layouts each fit one row without horizontal overflow.

- [ ] **Step 5: Verify GREEN and full confidence**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "keeps the final unsorted row visible"
npm test
npm run build:prod
```

Expected: focused test passes, all test suites pass, and the production build
exits successfully.

- [ ] **Step 6: Commit**

```bash
git add content.js tests/e2e/extension.spec.js tests/e2e/extension.spec.js-snapshots
git commit -m "fix: keep final unsorted photos visible"
```
