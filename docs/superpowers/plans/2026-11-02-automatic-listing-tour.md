# Automatic listing tour implementation plan

> Execute inline with superpowers:executing-plans. The user requested two fresh consultants for the product decision; both recommended removing the invitation row and showing a nonblocking introduction once. The user approved implementation.

**Goal:** Automatically introduce listing controls once without interrupting work, preserving Help replay and signed-out gating.

**Architecture:** Reuse the existing three-step tour and per-account local dismissal flag. Render the first automatic step without focus or scrolling, and suppress the automatic opportunity once the user interacts. Preserve current modal and busy-state guards and recheck them after storage reads.

**Tech stack:** Existing MV3 extension JavaScript, Chrome local storage, Playwright native-extension fixtures.

**Spec:** ../../listing-onboarding-design.md

## Constraints

- No publishing, production changes, live marketplace actions, or paid generation.
- Keep signed-in toolbar controls and Help replay. Remove only the invitation row.
- Preserve existing local dismissal flags and compact localized copy.
- The coordinated Firefox chat owns startup injection, model loading, CSS placeholders and startup performance evidence in its separate checkout. Integrate its scoped changes after review. Do not edit its files concurrently.
- Preserve the pre-existing unrelated change in lib/user-model-ui.js.

## Review focus

- A user typing or clicking before readiness must not be interrupted later.
- A changed account or route during a storage read must not show stale guidance.
- Existing dismissal and reload must prevent repetition.
- Optional loading or unavailable model controls must not become tour targets.
- Automatic appearance must preserve focus and scroll. Keyboard dismissal and manual replay remain usable.

## Tasks

- [x] Add behavioral browser coverage for automatic appearance, no invitation, focus/scroll preservation, remembered exposure and Help replay. Observed the old invitation implementation failing.
- [x] Update lib/listing-tools.js to replace the invitation with guarded automatic start. Persist exposure after a valid first render. Suppress late appearance after user activity and preserve existing flags.
- [x] Adapt existing tour and telemetry tests to automatic introduction. Verified create/edit pages, signed-out/account changes, missing model, conflicting dialogs and interaction-before-readiness.
- [x] Integrate the coordinated startup patch and timing evidence, resolving only the agreed content.js sections. Verified combined startup and tour behavior and inspected actual desktop/mobile renderings, including delayed loading.
- [x] Run npm test and npm run build:prod against the consolidated final source. Review the final scoped diff, clean owned scratch output, and deliver actual inline previews with measured timing limits.

## Progress

- Signed-out gating: four-line visibility change and two passing desktop/mobile authentication-transition regressions.
- Initial full run stopped deliberately when scope expanded: all 168 unit tests passed; browser run was partial, so it is not accepted as the final gate.
- Ownership confirmed with the Firefox chat. No duplicate startup implementation or full-suite run.
- Tour regressions: 17 passed. Immediate Help replay also reproduced a hidden first-tick dependency RED, then passed after owner initialization was decoupled from the polling interval.
- Actual automatic-tour desktop/mobile screenshots inspected. They preserve focus and scroll, retain Skip and remove the invitation row. Final consolidated screenshots will replace these pre-startup-integration captures.
- Lifecycle review found and reproduced four edge cases: sign-in return suppressed introduction, passive Escape restored stale focus, SPA route changes retained the tour, and concurrent windows could both open it. All four dedicated native regressions passed after correction. A background-worker claim with a five-second local lease serializes automatic launches across tabs without network access. Actual exposure is still persisted only after a valid first render.
- Integration review of the coordinated startup patch requested guards for stale initial owner reads, ready-only model exposure telemetry and immediate late-form notification. The other chat owns those follow-up corrections before integration.
- Integrated scoped startup commits ddf3956, 88b21d and a66ec9a. Combined tour/startup/model checks passed 35 tests before the final held-toggle follow-up. That follow-up passed all eight startup checks and preserves a pending toggle/error across refresh.
- Latest controlled medians: baseline model ready 3073 ms cold / 3033 ms warm; fixed 465 ms cold / 363 ms warm with a 300 ms API fixture. Core controls show no material measured speedup. See docs/qa/toolbar-startup for the full scope and data.
- Final-gate setup correction: the default ../quick-vint-api link resolves to the old Orion checkout, causing six phone-page recovery contract failures. One focus-sensitive navigation case timed out with four workers. That run was stopped, retained as diagnostic evidence and is not an accepted gate.
- Ruling: use the repository's configured single worker and pin AUTOLISTER_API_PATH to the current main API checkout at ../acquisition-report-repair (2ef1b9c). Validate phone/focus cases first, then run full npm test and production build. Do not change product code to accommodate an obsolete test fixture or conceal the failed attempt.
- Corrected setup verified: all 11 phone-page and real-focus navigation tests passed serially against the pinned current API checkout. No product changes were needed. The complete configured gate then used that same setup.
- Final gate passed: 168 unit tests and 403 browser tests, with 13 configured skips. Production build passed. Source diff check passed, and the pre-existing two-line lib/user-model-ui.js edit remains untouched. Local draft only, no publish or deployment.
- Desktop and narrow-screen rendered previews are preserved in the chat's final-toolbar visualization folder. Startup timing data and reproducible audit remain in docs/qa/toolbar-startup. Superseded owned screenshots, scratch patches and diagnostic logs were removed after their conclusions were recorded.

## Publication follow-through

- The owner asked this chat to handle Chrome publication on 2026-11-02. Firefox publication is excluded and remains with its own chat.
- UI source is committed as 6219e7b. Current upstream authentication hotfix 0b3148b and its tests were merged locally as ac30b48, preserving both changes. The unrelated lib/user-model-ui.js edit remains unstaged and unmodified.
- Combined authentication/startup/tour verification after the merge passed all 168 unit tests, 39 targeted browser tests and the production build. The earlier full UI gate remains recorded separately; it is not represented as a full gate of the new merged source.
- An authentication release was already running at https://github.com/samicodesit/quick-vint-frontend/actions/runs/41459833108. Its owner in chat 01a100a0-a690-7e91-9ab2-73150030dc3d confirmed that urgent release must finish first and any resulting Store submission must not be cancelled or replaced.
- The UI release is queued locally, not uploaded or submitted. Do not push frontend main before that workflow's release-state commit lands. Do not start another upload while its Store submission is pending. The authentication chat will notify this chat on release-state and published/cleared status.
- Resume by fetching and merging the release-state metadata, running release:status and checking actual Store state. Once clear, run the mandatory push:production gate with the matching API checkout, then dispatch chrome-web-store-release.yml on main with mode=upload-and-submit and bump_patch=true. Let release tooling choose the version from current records. Do not reuse the old 1.4.31 prediction after the authentication release.
