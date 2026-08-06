# Release Widget and Batch Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the August 6 welcome-page update widget and make batch interruption guidance, recovery routing, and review prompts behave correctly.

**Architecture:** The site renders one localized, local-storage-dismissed update widget directly on the existing welcome route. The extension persists one monotonic `hadIssues` flag and the last batch work-tab IDs beside the existing recovery checkpoint; only validated batch tabs may focus or recreate the controller tab. Existing batch-only status UI receives the single `Keep Chrome open` line without changing shared loaders.

**Tech Stack:** Astro 5, TypeScript, browser local storage, Chrome Manifest V3 APIs, existing Node and Playwright tests.

## Global Constraints

- No new dependency, database state, API endpoint, or Chrome permission.
- The widget date is visible before opening; opening or closing marks this release seen for later visits in the same browser profile.
- The widget contains exactly the three approved plain-language notes.
- Generated listing tabs never become batch controllers or get overwritten.
- Never automate CAPTCHA or click Vinted Save/Publish.
- Only the batch-tab loader shows `Keep Chrome open`; all other loaders remain unchanged.

---

### Task 1: Localized welcome-page update widget

**Files:**
- Modify: `quick-vint-api/src/i18n/welcome.ts`
- Modify: `quick-vint-api/src/i18n/__tests__/welcome.test.ts`
- Modify: `quick-vint-api/src/pages/welcome/[lang].astro`

**Interfaces:**
- Consumes: `WELCOME_COPY[locale]` and browser `localStorage`.
- Produces: `.welcome-update-widget` with closed/opened/seen states keyed by `autolisterUpdateSeen:2026-08-06`.

- [ ] Add failing locale assertions requiring `updateWidget` copy with `brand`, `closedDate`, `title`, `openDate`, and exactly three `{ title, body }` notes for every supported locale.
- [ ] Add the eight localized copy objects, keeping the approved English text exact and translating meaning rather than implementation terms.
- [ ] Replace the existing 1.4 text link with the compact text-only pill and expanded card. Use the approved indigo-to-teal tint, title-aligned dots, no decorative icon, no checkmarks, and no footer.
- [ ] Add native click handling: opening reveals details and immediately stores the release key for future visits; close is rendered/enabled only in the open state and stores the same key; the current opened card remains readable; storage read/write failures leave the widget usable for the current page without throwing.
- [ ] Run `npm test -- src/i18n/__tests__/welcome.test.ts`, `npm run type-check`, and `npm run build` in `quick-vint-api`.

### Task 2: Clean-batch review eligibility and isolated loader guidance

**Files:**
- Modify: `quick-vint/background.js`
- Modify: `quick-vint/content.js`
- Modify: `quick-vint/test/background-wardrobe-rewrite.test.js`
- Modify: `quick-vint/tests/e2e/extension.spec.js`

**Interfaces:**
- Consumes: existing batch recovery object and `showBatchTabStatus(message, state)`.
- Produces: persisted boolean `hadIssues`; batch-only secondary loader line `Keep Chrome open`.

- [ ] Add failing background assertions: clean completion sends `SHOW_BATCH_REVIEW_PROMPT`; worker restart, generation error, and resume set `hadIssues: true` and never send the prompt after eventual success.
- [ ] Persist `hadIssues: false` at start. Set it to true on worker-restart recovery, generation errors, and every resume attempt. Preserve true through all later checkpoint writes.
- [ ] Guard the final `SHOW_BATCH_REVIEW_PROMPT` message with `job.hadIssues !== true`; do not alter the normal done state.
- [ ] Add a failing browser assertion that `#quickvint-batch-tab-status.loading` contains a secondary `Keep Chrome open` line while success/error states do not, and that `.quickvint-generation-action` markup is unchanged.
- [ ] Add the line only inside `showBatchTabStatus()` when `state === "loading"`, with batch-specific styling.
- [ ] Run `node --test test/background-wardrobe-rewrite.test.js test/batch-review-prompt.test.js` and the focused Playwright loader test.

### Task 3: Return users to the correct recovery tab

**Files:**
- Modify: `quick-vint/background.js`
- Modify: `quick-vint/content.js`
- Modify: `quick-vint/test/background-wardrobe-rewrite.test.js`
- Modify: `quick-vint/tests/e2e/extension.spec.js`
- Modify: `quick-vint/scripts/run-live-batch-recovery.mjs`

**Interfaces:**
- Consumes: persisted `sourceTabId`, `currentWorkTabId`, and batch recovery groups.
- Produces: persisted `lastCompletedWorkTabId`; `SHOW_BATCH_RECOVERY_NUDGE`; `FOCUS_BATCH_RECOVERY` response `{ ok, sourceTabId, recreated }`.

- [ ] Add failing background tests proving only `currentWorkTabId` or `lastCompletedWorkTabId` can request recovery focus; an existing controller is activated; a missing controller creates a fresh `/items/new` tab and rebinds recovery; unrelated and expired callers are rejected.
- [ ] Persist `lastCompletedWorkTabId` after each successful item. When restart/error pauses a batch, notify the current and last completed work tabs with `SHOW_BATCH_RECOVERY_NUDGE` while the source tab keeps the full modal.
- [ ] Implement `FOCUS_BATCH_RECOVERY`: validate the caller against the saved work-tab IDs; focus the existing source tab, or create an active Vinted create tab on the same origin, wait until ready, persist its ID, and send it the recovery state.
- [ ] Add a compact content-script prompt reading `Batch interrupted` with a `Return to batch` button. Deduplicate it, remove it after a successful focus, and never render it for unrelated or expired recovery.
- [ ] Add focused Playwright assertions for the nudge, repeat messages, successful return, and error response.
- [ ] Extend the real runner to assert the nudge on the generated work tab, click `Return to batch`, verify the controller becomes active, resume 2/2, and retain the existing zero Save/Publish assertion.
- [ ] Run the focused unit/Playwright checks and the persistent real two-item recovery flow.

### Task 4: Release verification and push

**Files:**
- Verify both repositories and all files above.

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: production `main` pushes for site and extension with real-flow evidence.

- [ ] Run `npm run verify:production` in `quick-vint-api` and `npm test` in `quick-vint`.
- [ ] Inspect the real result JSON and production `log-detail` bodies for one stable batch ID, interruption reason, resume, and completion.
- [ ] Commit the site and extension changes separately.
- [ ] Run `npm run push:production` in each repository; verify each output contains `main -> main`.
