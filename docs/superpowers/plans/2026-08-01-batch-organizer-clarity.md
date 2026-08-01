# Batch Organizer Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the confusing sticky gallery and stretched upload choices with a compact, clearly sectioned, single-scroll batch experience.

**Architecture:** Keep the existing modal and batch state flow. Simplify the organizer DOM to one wrapping grid plus a grouped-items section, use native scrolling and a header jump button, and change only CSS/markup/control updates in `content.js`.

**Tech Stack:** Plain JavaScript, template CSS, Playwright.

## Global Constraints

- No new dependency or custom scrollbar JavaScript.
- No success/filler capacity note.
- No pill-shaped status controls.
- Preserve the tall stable modal, capacity enforcement, grouping semantics, mobile accessibility, and no-horizontal-overflow guarantees.

---

### Task 1: Organizer navigation and section hierarchy

**Files:**
- Modify: `tests/e2e/extension.spec.js`
- Modify: `content.js`

**Interfaces:**
- Consumes: existing `batchRemoteFiles`, `batchMarkedGroups`, `updateBatchGroupingControls()`, and `markSelectedPhotosAsGroup()`.
- Produces: `.organize-jump-to-photos`, `.batch-gallery-section`, `.batch-gallery-grid`, and `.batch-groups-section`.

- [ ] Add a Playwright test that groups photos, verifies all remaining photos stay in one multi-row grid, confirms no sticky row exists, checks visible scroll overflow, scrolls to grouped items, clicks the header control, and observes `batch-review.scrollTop === 0`.
- [ ] Run the focused test and confirm it fails because the sticky row still exists and the jump control/section wrappers do not.
- [ ] Replace the sticky-row markup and layout function with one grid; add labeled gallery/group sections, the fixed header jump button, native `overflow-y: scroll`, and section/count updates.
- [ ] Run the focused test and existing grouping/generation tests until green.

### Task 2: Actionable capacity messaging only

**Files:**
- Modify: `tests/e2e/extension.spec.js`
- Modify: `content.js`

**Interfaces:**
- Consumes: existing `batchGenerationCapacity` and `batchCapacityLoading`.
- Produces: hidden capacity note for sufficient capacity; warning/error note only when the user must act.

- [ ] Change the sufficient-capacity browser assertion to require no visible capacity note and no text matching `Using .* available`; retain the limited-generation warning assertion.
- [ ] Run both capacity tests and confirm the sufficient-capacity test fails on the current filler note.
- [ ] Hide the note for loading/sufficient states while retaining partial-capacity and blocked/error copy.
- [ ] Re-run both tests and confirm they pass.

### Task 3: Compact source presentation

**Files:**
- Modify: `tests/e2e/extension.spec.js`
- Modify: `content.js`

**Interfaces:**
- Consumes: existing source-panel markup and stable modal dimensions.
- Produces: centered desktop source grid with compact equal-height panels.

- [ ] Add desktop geometry assertions requiring a tall modal but source panels no taller than 430px and a dropzone no taller than 270px.
- [ ] Run the test and confirm it fails against the stretched panels.
- [ ] Center the source grid vertically, remove full-height panel/dropzone flexing, and set compact desktop panel/dropzone geometry.
- [ ] Re-run desktop and Orion mobile source tests.

### Task 4: Visual and release verification

**Files:**
- Modify if inspection exposes a defect: `content.js`, `tests/e2e/extension.spec.js`

- [ ] Capture settled desktop source, desktop organizer, grouped/scrolled organizer, and mobile organizer screenshots to `/tmp`; inspect them at original resolution.
- [ ] Run the focused organizer, capacity, source, mobile, and generation tests.
- [ ] Run `npm test`, `npm run build:prod`, and `git diff --check`.
- [ ] Request read-only code review, fix all Critical/Important findings, commit, fast-forward `quick-vint`, rebuild there, and rerun focused browser checks.
