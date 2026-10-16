# Evidence and limits

## Demonstrated findings during this work

1. Closing the upload chooser destroyed the Phone/Computer button's icons and badge. The helper saved plain text and then replaced the original child nodes with that text. The candidate restores the original nodes. The loaded-extension regression failed before the fix and passed three repetitions afterward.
2. After a successful single-item generation from computer photos, Generate stayed disabled on `Preparing...`. Success intentionally cleared the used temporary image URLs, but the pending-upload predicate treated those cleared URLs as unfinished uploads. This was observed manually in the loaded extension, then reproduced by a failing regression. The candidate distinguishes intentionally invalidated URLs from new files awaiting upload, preserves the local files and does not reuse the consumed remote URLs. Three runs verify the button becomes usable after success, adding a new photo still waits for upload, and another explicit generation uses retained local image data plus the new photo's storage URL.

These are demonstrated product defects in the tested current code. They are not evidence that either caused the earlier customer batch interruption or phone transport failures. The original customer's physical connection failure remains unattributed.

[Rejected single-item state before the fix](single-computer-failure.png). This capture is evidence of the failure, not an accepted review step.

## Manual walkthrough checks

- Extension batch: four fixture photos grouped into two items, one explicit start, first and second actual tabs focused while their model responses were held, filled fields, both items ready, original review tabs reopened, seller edit accepted. Two controlled generation requests.
- Extension single/computer: two JPEG files selected through the real browser input, two real multipart requests intercepted by local storage fixtures, one explicit generation, text filled, button returned to usable state, seller edit accepted.
- Extension single/phone: QR waiting UI, controlled session readiness, two retained photos, one explicit generation, modal closed and title/description filled. This did not use an actual handset or diagnose a transport failure.
- Web app: first-use style setup completed through its visible button; single item with two photos generated, edited, copied to the real clipboard and reopened after reload with both photos; an edit saved while Chromium networking was offline; networking restored; three more photos grouped into two items and sequentially generated after one start; ready drafts reopened and description copied; 390 px and 1440 px layouts inspected without horizontal overflow. Three controlled generations, five browser uploads, three stored drafts and zero page errors in this manual session.

## Test results

- 112 frontend unit tests passed after the single-item URL-state fix.
- Frontend production build passed after that fix.
- Upload chooser and single-item URL-state regressions: 6 passes, two cases repeated three times.
- The combined loaded-extension reliability/navigation/replay/single suite passed 51 checks in 3.5 minutes: 17 cases repeated three times, using one browser worker.
- The broader web app local-browser suite passed all 24 checks with zero page errors, including image editing/restoration, local persistence, offline edits, grouping, sequential generation, quota handling, controlled lost-response lookup, copy, local listed status and account-sheet behavior. Five controlled generations and 14 browser uploads were exercised. No live checkout or paid service was called.
- Two stale web test assumptions were corrected before that pass: the existing-account fixture had used the current date and unexpectedly entered the new-account style setup; it now uses a stable creation date, while the manual review separately covers first-use setup. The final quota telemetry assertion expected the old `errorCode` field; current paywall code emits the same quota code in `reason`, which the assertion now checks exactly. These test mismatches did not justify product UI changes.

No full release gate is claimed from this partial list. The extension's broader network/worker recovery work and full release verification remain outstanding.

## Latest authenticated real Vinted evidence read

Production admin `log-detail` ID: `e79ad7ff-2310-4302-ad87-0b84d518f6de`.

- Occurred: `2026-10-15T16:43:02.950Z`.
- Installed extension: `1.4.16`.
- Actual URL: `https://www.vinted.nl/items/new?autolister_canary=1792082577347`.
- Page title: `Artikel plaatsen | Vinted`.
- Detail status: `passed`, `result.injected: true`.
- DOM flags true: title, description, file input, AutoLister tools, Generate, Sign in, Phone, title language and description language.

Verified selectors include `input[data-testid="title--input"]`, `textarea[data-testid="description--input"]` and the actual `add-photos-input` file-input variants. The local fixture reuses these entry points. That is selector correspondence, not equivalence to Vinted's application behavior.

This canary verifies selectors and injection at that time on the published extension. It does not verify the candidate's batch generation, host photo uploads, category/size/price controls, interruption recovery or listing publication. The scheduled canary was not launched or replaced for this review.

## Delivery and source scope

Extension candidate base: `d4e2eea3ab2c3142ab2fbbdc212822e6c48e1dc3`.

Web app build base: `fee91d9473d5327d30b1b930188c0a7e3256fb22`. Backend review changes are confined to the browser test harness. Product web app components and styles are unchanged.

The working extension candidate is uncommitted and unshipped. This review-only feature-branch commit does not contain or release those product changes. Capture times are in [steps.json](steps.json). Screenshots are actual captures; detail variants only remove surrounding margins and do not redraw UI.
