# Wardrobe Toolbar Content Preferences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the sell page's existing content preference controls to the wardrobe selection toolbar while keeping the actions clear and applying the saved-note choice consistently to every listing in the wardrobe job.

**Architecture:** Reuse the five existing control creators and their existing Chrome storage keys on the wardrobe profile page. Reshape the wardrobe controller into a main action row and a wrapping content-preference row. Pass only the page-local saved-note inclusion boolean through the existing wardrobe background job; all other settings remain shared storage preferences read by the existing generation helper.

**Tech Stack:** Vanilla JavaScript content script, MV3 background service worker, existing injected CSS and Chrome storage.

## Global Constraints

- Do not add a dependency or a second preference model.
- Keep title and description language controls unchanged.
- Shared content preferences remain shared with the sell page.
- Wardrobe selection, progress, apply mode, and item state remain isolated.
- Do not publish the extension.
- Defer automated test edits and runs until the user approves the visual result.

---

### Task 1: Reuse the sell-page controls in the wardrobe toolbar

**Files:**
- Modify: `content.js:9887-10095`
- Modify: `content.js:18103-18160`

**Interfaces:**
- Consumes: `createDescriptionLengthToggle()`, `createOutputShapeToggleButton()`, `createHashtagsToggleButton()`, `createDescriptionFooterControl()`, and `createEmojiToggleButton()`.
- Produces: `.quickvint-wardrobe-selection-main`, `.quickvint-wardrobe-selection-preferences`, and the five existing controls mounted inside the wardrobe controller.

- [ ] **Step 1: Reshape the controller markup**

Wrap the current count, language fields, and actions in:

```html
<div class="quickvint-wardrobe-selection-main">...</div>
<div class="quickvint-wardrobe-selection-preferences">
  <span class="quickvint-wardrobe-selection-preferences-label">Content</span>
  <div class="quickvint-wardrobe-selection-preferences-controls"></div>
</div>
```

Keep the feedback paragraph after both rows.

- [ ] **Step 2: Mount the existing controls**

After creating the two language fields, assign the existing singleton references and append their controls:

```js
descriptionLengthToggle = createDescriptionLengthToggle();
outputShapeToggleBtn = createOutputShapeToggleButton();
hashtagsToggleBtn = createHashtagsToggleButton();
const descriptionFooterControl = createDescriptionFooterControl();
emojiToggleBtn = createEmojiToggleButton();

controller
  .querySelector(".quickvint-wardrobe-selection-preferences-controls")
  .append(
    descriptionLengthToggle,
    outputShapeToggleBtn,
    hashtagsToggleBtn,
    descriptionFooterControl,
    emojiToggleBtn,
  );
```

This reuses all existing loading, storage, entitlement, modal, and synchronization behaviour.

- [ ] **Step 3: Add responsive wardrobe-only layout styles**

Change the controller to a one-column grid. Make the main row a wrapping flex row, retain `margin-left: auto` on actions, and make the preference row a separated wrapping flex row. Override only the reused controls inside `.quickvint-wardrobe-selection-controller` to remove sell-page drop shadows and keep a consistent 38–40px toolbar height. At `max-width: 760px`, keep actions on their own full-width row; at `max-width: 520px`, let the preference label span the row and the controls wrap with 6px gaps.

- [ ] **Step 4: Leave the implementation uncommitted for visual review**

Do not run automated tests or publish. Reload the unpacked extension and inspect the toolbar on a real wardrobe at wide, medium, and narrow widths.

---

### Task 2: Carry the saved-note inclusion choice through the wardrobe job

**Files:**
- Modify: `content.js:16935-16975`
- Modify: `content.js:17125-17265`
- Modify: `content.js:18175-18205`
- Modify: `background.js:855-1018`

**Interfaces:**
- Consumes: `descriptionFooterIncludeForListing`, `ensureDescriptionFooterListingState()`, and the existing `START_WARDROBE_REWRITE` / `RUN_WARDROBE_REWRITE_ITEM` messages.
- Produces: optional boolean `descriptionFooterIncluded` on both wardrobe messages and optional `descriptionFooterIncludedOverride` on `generateCurrentListing()`.

- [ ] **Step 1: Snapshot the source toolbar choice**

Before sending `START_WARDROBE_REWRITE`, call `ensureDescriptionFooterListingState()` and include:

```js
descriptionFooterIncluded: descriptionFooterIncludeForListing,
```

- [ ] **Step 2: Validate and preserve the optional boolean in the background job**

Reject a non-boolean value when the field is present. Store the job value as:

```js
descriptionFooterIncluded: message.descriptionFooterIncluded !== false,
```

Pass the same value to every `RUN_WARDROBE_REWRITE_ITEM` message. Treat omission as `true` to preserve compatibility with existing callers and fixtures.

- [ ] **Step 3: Add the narrow generation override**

Extend `generateCurrentListing()` with:

```js
descriptionFooterIncludedOverride = null,
```

Resolve the existing value with:

```js
const effectiveDescriptionFooterIncluded =
  descriptionFooterAccess &&
  (typeof descriptionFooterIncludedOverride === "boolean"
    ? descriptionFooterIncludedOverride
    : descriptionFooterIncludeForListing);
```

Pass `message.descriptionFooterIncluded` from `runWardrobeRewriteItem()`. Do not override saved-note text, entitlement, or any other preference.

- [ ] **Step 4: Leave the implementation uncommitted for visual review**

Do not run automated tests or publish. The post-approval test pass will cover responsive toolbar rendering, shared preference persistence, optional-message compatibility, and saved-note on/off propagation.
