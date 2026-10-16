# Verification and limits

## Web-only scope

This candidate changes the web draft workspace, its existing components and styles. It replaces ready-row settings with Review, reuses one progress panel during review, skips unfinished items during Next navigation and removes redundant grouping completion UI after the batch starts. It preserves the batch return path after explicitly marking an item as listed. It also fits the existing Settings control at 320px and keeps progress below the measured sticky header while scrolling.

No extension product source, shared generation API, authentication, billing, upload implementation, database schema or production service was changed for this increment. SHA-256 checks confirm `background.js`, `content.js` and `manifest.json` match their pre-adjustment candidate fingerprints. The older extension reliability work remains a separate, unreleased candidate.

## Demonstrated checks

- Primary-agent browser walkthrough: selecting and grouping actual fixture images, starting once, opening the first result while the second is held pending, editing, actual clipboard copy, later completion without forced navigation, Next ready, Back to batch, explicit Mark as listed and a new single item afterward.
- New focused Chromium journey passed three consecutive runs. It verifies the initial overview remains, early Review replaces settings, progress survives entering the editor, unfinished Next is disabled, later completion preserves edits, all original photo IDs remain and each batch item generates once.
- The same journey passed with 20 items, including reviewing and copying item 1 before the remaining batch completes. This is a controlled interaction check, not production throughput measurement.
- Bounds and scroll checks at 320, 390, 768 and 1440px: no horizontal overflow; header logo and settings do not overlap; scrolled progress stays below the sticky header; progress and the bottom item action do not overlap.
- Existing full web browser journey: 24 checks passed, zero page errors, five controlled generations and 14 controlled temporary-storage uploads. Includes normal single-item generation, actual image editing, IndexedDB retention after reload, offline editing, quotas/paywalls, copy, listed status and lost-response result lookup.
- Production verification completed: lint, TypeScript, production build, format check, 134 test files passed and 994 tests passed. Two test files with four opt-in tests were skipped. They are not counted as passes.
- Combined product diff inspected and whitespace check passed. No production deployment or Chrome Store submission occurred.

## Failures found and corrected during acceptance

1. Opening a new single item after completing a batch retained the old batch panel and hid Generate. The broad browser journey failed on the missing visible Generate action. Queue visibility now updates when the view changes; both the broad journey and a focused regression pass.
2. Explicit Mark as listed advanced to the next ready result but lost Back to batch. The same actual browser interaction reproduced this. The batch origin is retained during advancement and covered by a focused regression.
3. At 320px the existing Settings label overlapped the brand. A screenshot and a failing geometry assertion confirmed it. Only at widths up to 350px, Settings uses its existing icon and accessible Listing settings label with a 44px target. The standard phone header remains unchanged.
4. While scrolling a long description, progress reached y=0 behind the sticky header. Actual browser geometry and a screenshot confirmed it. The panel now uses the observed header height; scrolled geometry passes at all four widths.

The failed attempts were corrected before acceptance. A separate invocation failed to reach setup because the build had been replaced with non-fixture configuration; it supplied no product evidence and was rerun against the correct fixture build.

## What was real and controlled

Real: built product HTML/CSS/JavaScript, Chromium layout and navigation, photo decoding/preparation, local IndexedDB and image blobs, autosave, editing, clipboard and account-scoped local draft state.

Controlled: fixture account/authentication, entitlement and quota responses, temporary-storage endpoint responses, generated text and response timing. Example photos and text are fixture data. Holding a response establishes that review can proceed while another result is pending. It does not reproduce the historical customer's network or provider failure.

Untested here: native iPhone/iPad Safari or Orion, native keyboard/suspension behavior, actual mobile-to-server transport, paid model/provider availability, full Vinted forms or publication. Chromium phone dimensions do not certify those environments. No paid generation, live marketplace action or customer contact was used.

## Remaining background-processing limit

The browser starts each subsequent queued item. An already-started generation has an existing result recovery path, but later items are not server-owned jobs. If the phone OS suspends AutoLister when the seller switches apps, remaining items may wait until it returns. The visible instruction remains Keep AutoLister open while preparing.

A durable backend batch design is written separately. It requires approved persistent jobs, worker recovery and photo retention handling. None was added in this increment. The current screenshots and passing UI tests do not claim reliable processing while the browser is suspended, historical incident recovery or complete release acceptance for the separate extension candidate.
