# Listing Tools Collapse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one polished persisted collapse control to the shared AutoLister tools on Vinted create and edit pages.

**Architecture:** Keep every existing action and preference in the existing `content.js` injection flow. Wrap them in one expandable shell, add one compact branded trigger, and use one stored boolean plus a CSS state class for both routes.

**Tech Stack:** Vanilla JavaScript, CSS, Chrome extension storage, Playwright.

## Global Constraints

- Expanded on first use.
- One stored preference shared by `/items/new` and `/items/:id/edit`.
- Reuse every existing control; add no dependency, background message, or page-specific implementation.
- Respect keyboard navigation and `prefers-reduced-motion`.

---

### Task 1: Shared collapsible listing tools

**Files:**
- Modify: `content.js`
- Test: `tests/e2e/extension.spec.js`

**Interfaces:**
- Consumes: existing `.quickvint-tools`, `.quickvint-primary-tools`, `.quickvint-tool-options`, and `chrome.storage.local`.
- Produces: `quickvintListingToolsCollapsed`, `.is-collapsed`, `.quickvint-tools-collapse`, and `.quickvint-tools-compact`.

- [ ] **Step 1: Add the focused browser regression**

Extend the existing listing-tools browser coverage to assert first-use expansion, collapse persistence, `aria-expanded`, compact restoration, and reuse on an edit URL.

- [ ] **Step 2: Verify the new assertions fail**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "collapses listing tools"
```

Expected: FAIL because the collapse controls do not exist.

- [ ] **Step 3: Implement the shared state and markup**

In `content.js`, add the storage key, CSS transitions, expanded shell, collapse button, compact branded button, and a small initializer that:

```js
chrome.storage.local.get({ quickvintListingToolsCollapsed: false }, (storage) => {
  setListingToolsCollapsed(Boolean(storage.quickvintListingToolsCollapsed), false);
});
```

User-triggered changes persist the boolean. Update `aria-expanded`, `aria-hidden`, and `inert`; suppress motion during hydration and for reduced-motion users.

- [ ] **Step 4: Run focused verification**

```bash
node --check content.js
npx playwright test tests/e2e/extension.spec.js --grep "collapses listing tools"
git diff --check
```

Expected: syntax and diff checks exit 0; focused browser test passes.

- [ ] **Step 5: Hand off for visual inspection**

Do not publish or push. Tell the user to reload the unpacked extension and inspect both create and edit pages.
