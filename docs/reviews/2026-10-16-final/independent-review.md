# Fresh independent release review

Date: 2026-10-17

Verdict: **GO**. The two S3 copy and UX findings from the first pass were corrected in API commit `ea5966b1fdb34c792991113f465a60e5dfb06093` and independently rechecked below. I found no release-blocking safety, behavior, performance, or open copy defect in the final candidate. This is a review result, not a claim that anything has shipped.

## Scope and identity

- Frontend candidate: `b1088b13ff52385e681662aa593d029f740b1750`, reviewed against `d4e2eea3ab2c3142ab2fbbdc212822e6c48e1dc3`.
- API/site final candidate: `ea5966b1fdb34c792991113f465a60e5dfb06093`, including bounded polish diff from `97b69956131e1ec84574b6bdedabfad719455b0f`, reviewed against `fee91d9473d5327d30b1b930188c0a7e3256fb22`.
- Packaged extension: `/tmp/autolister-final-packaged-b1088b1`, source package metadata `/tmp/autolister-release-package-files.json`.
- All product files remained read only. I used only disposable fixture browser contexts and API fixture preview4331. I did not access localhost:4187, existing profiles, live marketplace flows, paid generation, credentials, deployment, publication, or customer contact.

## First-pass findings, resolved in final polish

### S3. Web failure view repeats the failure state and can join two sentences without punctuation

The fresh failure fixture renders `0 of 2 ready · 2 need attention` in the queue panel and `Needs attention` again as the editor heading. The same view then renders `Controlled definitive failure Previous text kept.` as one run-on line. The screenshot is `/tmp/autolister-final-independent-web-failure/failed-replacement.png`.

The sources are:

- `src/app/mobile-web/draftWorkspace.ts:1593-1597`, which sets the editor heading to `Needs attention`.
- `src/app/mobile-web/draftWorkspace.ts:1713-1715`, which appends ` Previous text kept.` directly to the server error string.
- `src/app/mobile-web/draftWorkspace.ts:2370-2376`, which keeps the nearby queue summary with `need attention`.

This is a confirmed copy issue under the latest compact-copy rule. It does not alter retry, Copy previous, Next exclusion, or payment behavior, so it is not a release blocker. The fixture error text is controlled; the punctuation defect is in the concatenation logic.

Final API polish removes the appended helper and changes the batch summary to `N failed`, while retaining the per-item `Needs attention` state and explicit `Copy previous` labels.

### S3. Expired phone upload retains the stale open-session expiry hint

The fresh expired transport case renders `Upload Expired` and tells the user to start a new phone upload, while the same screen still says `Expires after 1 hour idle.` The accepted screenshot is `/tmp/autolister-fresh-phone-expired/expired.png` and the transport case passed with one 410 request and no retry.

The relevant source is `src/pages/phone-upload.html:575-577` for the always-visible hint and `:1493-1501` for the terminal expired state. The hint is also present in the production base, so this is release-present UX debt rather than a newly introduced behavioral regression. It conflicts with the terminal recovery message and the latest rule to keep only necessary action, consequence, or recovery text. It does not block release.

Final API polish updates `setDraftControlsLocked` at `src/pages/phone-upload.html:1350-1359` to hide this hint when `state.terminal` or `state.cancelled` is true.

## Independent checks run

### Frontend and packaged extension

- Source lifecycle, terminal checkpoint, ownership, stop, and discard checks: 13 passed in 1.6 minutes with the frozen frontend head.
- Additional source review suite covering background tracking, completion cleanup, interruptions, orphan recovery, progress discard, recovery controls and deadlines, review navigation, terminal acknowledgment, and tracking: **54 passed in 4.2 minutes**.
- Actual packaged extension at `/tmp/autolister-final-packaged-b1088b1`: request replay and account or tab isolation checks: **12 passed**.
- `git diff --check` passed for the frontend and API candidate diffs.

### API/site and web UI

- Fresh web review against fixture preview4331: 2 items, Review while later work continues, progress retention, focus and edit retention, explicit Next and Back to batch, and one generation per item: passed. Result: `/tmp/autolister-final-independent-web-review/result.json`.
- Failure review: failed replacement remains Needs attention, Copy previous does not generate, retained output stays copyable, explicit retry restores normal controls: passed with 2 controlled failed calls and 2 retained photos. Result: `/tmp/autolister-final-independent-web-failure/failed-result.json`.
- Queued replacement review: passed with first ready title `Dress 4` and 6 controlled generations. Result: `/tmp/autolister-final-independent-web-queued/queued-result.json`.
- History review passed with distinct=false, two stable review orders, two photos, and reload plus Resume, completion, and Next behavior.
- Targeted API tests: `phoneUploadHtml.test.ts`, `draftWorkflow.test.ts`, `app.test.ts`, and `releaseContract.test.ts`: **47 passed**.

### Phone transport

These checks used real Chromium file selection, image preparation, multipart XHR, loopback HTTP, controlled socket termination, and a held response. They did not use live services.

- Disconnect and recovery: passed, 15 attempts, 13 dropped sockets, both upload orders recovered, no cleanup.
- Idle timeout and retry: passed, 46.2 seconds, 2 attempts, upload order 0 recovered, no cleanup.
- Expiry: passed, one 410 request, no retry, terminal controls hidden.
- Cancel: passed, 13 dropped attempts, no uploaded files, one cleanup request, no late restart.
- Prepare retry: passed, two uploaded orders after nine dropped prepare attempts, no cleanup.

Evidence JSON is in `/tmp/autolister-fresh-phone-disconnect/disconnect.json`, `/tmp/autolister-fresh-phone-idle/idle.json`, `/tmp/autolister-fresh-phone-expired/expired.json`, `/tmp/autolister-phone-transport/cancel.json`, and `/tmp/autolister-phone-transport/prepare.json`.

### Package integrity

An independent Node hash check matched all **35 of 35** extracted package files to `/tmp/autolister-release-package-files.json`, with no extra or missing files. The manifest is version `1.4.17`. Selected source hashes for the frontend background, content, manifest, API draft workspace, phone upload page, and listing styles also matched `/tmp/autolister-predeploy-product-hashes.json`.

## Final polish addendum

I rechecked only API `97b69956131e1ec84574b6bdedabfad719455b0f..ea5966b1fdb34c792991113f465a60e5dfb06093`. The bounded diff contains the queue-copy expectation updates, the web status correction at `src/app/mobile-web/draftWorkspace.ts:1713-1715`, the `N failed` batch summary at `:2370-2376`, and the terminal or cancelled expiry-hint hide at `src/pages/phone-upload.html:1350-1359`. No service, generation, or control behavior was added. Frontend `b1088b13ff52385e681662aa593d029f740b1750` and the tested package remain unchanged.

Focused final checks passed:

- Final API failure and Copy previous review: 2 controlled failed calls, 2 retained photos, explicit retry, no generation from copying. Evidence: `/tmp/autolister-final-independent-final-copy-failure/failed-result.json` and the inspected 390 pixel screenshot `failed-replacement.png`, which now shows `0 of 2 ready · 2 failed`, one `Controlled definitive failure` line, and `Copy previous` controls.
- Final mixed failure and reload review: passed with one failure, one ready item, Next enabled only for the ready item, 2 retained photos, and no regeneration. Output: `/tmp/autolister-final-independent-final-copy-mixed`.
- Final phone expiry: passed with one 410 request, no retry, terminal controls hidden, and the expiry hint absent from the inspected screenshot `/tmp/autolister-final-independent-final-copy-expired/expired.png`.
- Final phone cancel: passed with 13 dropped attempts, no uploaded files, one cleanup request, no late restart, and the cancellation screen hiding the expiry hint. Evidence: `/tmp/autolister-final-independent-final-copy-cancel`.
- Final targeted API tests: `phoneUploadHtml.test.ts`, `draftWorkflow.test.ts`, `app.test.ts`, and `releaseContract.test.ts`, **47 passed**.
- Final API diff `git diff --check` passed. The frontend head is exactly `b1088b13ff52385e681662aa593d029f740b1750`; the API head is exactly `ea5966b1fdb34c792991113f465a60e5dfb06093`; the package SHA256 is exactly `7cb43994b4424951fe16d93e18f91fe742bf2bb3f2a42ad881b51e33d97a21ce`.

The final candidate therefore has **GO** status with no open confirmed findings. The minimal-copy rule is satisfied in the checked success, failure, expiry, and cancellation states. The full-gate and native or production limits below remain unchanged.

## Copy, UX, and accessibility assessment

Normal web success is compact at 320 and 390 pixels. It exposes Review as each item is ready, retains the single progress panel while work continues, keeps Mark as listed visible, and does not show recovery guidance after success. The active queue text `Keep AutoLister open while preparing.` is a necessary action and consequence. The first-pass failure copy issues above are resolved in the final polish. Final failure copy retains the useful recovery action, Copy previous, and explicit retry cost without repeating the batch failure state or appending redundant helper text.

Phone waiting state uses the necessary message `Waiting for your connection. Your photos are kept here.` and keeps Cancel available. It has no horizontal overflow in the tested 390 pixel transport cases. Final expired and cancelled states hide the stale open-session hint. Screenshots and DOM checks do not establish full keyboard, screen reader, native Orion, or iOS accessibility behavior.

## Limits

- The host is a selector fixture, not full live Vinted React or production service behavior.
- Auth, model, remote storage, and billing are controlled. Replay proves client identity reuse, not production credit or refund behavior.
- Native Orion and iOS behavior, arbitrary OS suspension, and exact historical customer recovery remain unverified.
- No paid generation, live marketplace action, customer contact, deployment, or Store upload was performed.
- Root's ledger records the prior full gates, including 124 frontend unit tests, 290 browser tests, 994 API tests, production build checks, 51 lifecycle repeats, 48 package checks, 20-item web coverage, 24 web checks, and 19 phone HTTP journeys. I treated those as recorded context and independently ran the focused checks listed above.

