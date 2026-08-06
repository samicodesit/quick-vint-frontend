# Release Widget and Batch Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the August 6 Vinted listing-page update widget and make batch interruption guidance, recovery routing, and review prompts behave correctly.

**Architecture:** The extension renders one Chrome-storage-dismissed update widget on Vinted create/edit routes, persists one monotonic `hadIssues` flag and the last batch work-tab IDs beside the existing recovery checkpoint, and allows only validated batch tabs to focus or recreate the controller tab. Existing batch-only status UI receives the single `Keep Chrome open` line without changing shared loaders.

**Tech Stack:** Astro 5, TypeScript, browser local storage, Chrome Manifest V3 APIs, existing Node and Playwright tests.

## Global Constraints

- No new dependency, database state, API endpoint, or Chrome permission.
- The widget date is visible before opening; opening or closing marks this release seen for later visits in the same browser profile.
- The widget contains exactly the three approved plain-language notes.
- Generated listing tabs never become batch controllers or get overwritten.
- Never automate CAPTCHA or click Vinted Save/Publish.
- Only the batch-tab loader shows `Keep Chrome open`; all other loaders remain unchanged.

---

### Task 1: Vinted listing-page update widget

**Files:**
- Modify: `quick-vint/content.js`
- Modify: `quick-vint/tests/e2e/extension.spec.js`

**Interfaces:**
- Consumes: Vinted `/items/new` and `/items/{id}/edit` routes and `chrome.storage.local`.
- Produces: `#quickvint-release-update-widget` with closed/opened/seen states keyed by `quickvintReleaseUpdateSeen:2026-08-06`.

- [x] Add the compact text-only pill and expanded card with the approved copy, color, title-aligned dots, no decorative icon, no checkmarks, and no footer.
- [x] Show it only on Vinted create/edit pages and persist the dated seen key when opened or closed.
- [x] Add focused browser coverage for new/edit routes and the already-seen state.

### Task 2: Clean-batch review eligibility and isolated loader guidance

**Files:**
- Modify: `quick-vint/background.js`
- Modify: `quick-vint/content.js`
- Modify: `quick-vint/test/background-wardrobe-rewrite.test.js`
- Modify: `quick-vint/tests/e2e/extension.spec.js`

**Interfaces:**
- Consumes: existing batch recovery object and `showBatchTabStatus(message, state)`.
- Produces: persisted boolean `hadIssues`; batch-only secondary loader line `Keep Chrome open`.

- [x] Add failing background assertions: clean completion sends `SHOW_BATCH_REVIEW_PROMPT`; worker restart, generation error, and resume set `hadIssues: true` and never send the prompt after eventual success.
- [x] Persist `hadIssues: false` at start. Set it to true on worker-restart recovery, generation errors, and every resume attempt. Preserve true through all later checkpoint writes.
- [x] Guard the final `SHOW_BATCH_REVIEW_PROMPT` message with `job.hadIssues !== true`; do not alter the normal done state.
- [x] Add a failing browser assertion that `#quickvint-batch-tab-status.loading` contains a secondary `Keep Chrome open` line while success/error states do not, and that `.quickvint-generation-action` markup is unchanged.
- [x] Add the line only inside `showBatchTabStatus()` when `state === "loading"`, with batch-specific styling.
- [x] Run the focused background and Playwright loader checks.

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

- [x] Add background tests proving only the saved work tabs can request recovery focus; an existing controller is activated; a missing controller creates a fresh `/items/new` tab and rebinds recovery; unrelated callers are rejected.
- [x] Persist `lastCompletedWorkTabId` after each successful item and notify saved work tabs when restart/error pauses a batch.
- [x] Implement validated `FOCUS_BATCH_RECOVERY` focus/recreate routing.
- [x] Add and deduplicate the compact `Batch interrupted` / `Return to batch` prompt.
- [x] Add focused Playwright assertions for repeat messages and successful return.
- [x] Extend the real runner to assert the nudge, controller focus, resume to 2/2, and zero Save/Publish clicks.
- [x] Run the focused checks and the persistent real two-item recovery flow.

### Task 4: Release verification and push

**Files:**
- Verify both repositories and all files above.

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: production `main` pushes for site and extension with real-flow evidence.

- [x] Run `npm test` in `quick-vint`.
- [x] Inspect the real result JSON and production `log-detail` bodies for one stable batch ID, interruption reason, resume, and completion.
- [ ] Commit the extension changes.
- [ ] Run `npm run push:production`; verify output contains `main -> main`.
