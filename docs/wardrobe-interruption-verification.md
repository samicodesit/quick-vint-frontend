# Wardrobe interruption verification

## Incident and version

Incident `e4d71581-5aa0-4e38-852e-5d49be7c4dbb` reports desktop Chrome
extension 1.4.17 stopping at item 3 of 9. Its third API request succeeded after
the message channel closed, without a matching client receipt. The original
tab closure, navigation or renderer trigger remains unproven.

The baseline used the actual 1.4.17 ZIP from release workflow 39012948783,
source `b1088b1`. Its payload was previously verified against all 35 tested
package files. Official Store status run 39041152563 confirmed 1.4.17
published at 100 percent with no pending submission on October 17.

## Reproduction and correction

Fifteen baseline runs exercised nine-item review and replace flows with real
tab switching, then controlled closure, reload and worker termination at the
third item. Each scenario ran three times. Normal runs completed; closing or
reloading the work tab produced the reported Chrome error. These controlled
actions reproduce the failure mechanism, not the historical customer's trigger.

The demonstrated defect was recovery feedback: a raw browser error disappeared
after 2.4 seconds while items remained unfinished. The correction keeps the
existing feedback visible until Exit selection, uses concise wording and shows
only the confirmed completed count. Existing terminal control locking prevents
accidentally restarting the whole selection. Normal success UI is unchanged.

Only the in-flight wardrobe edit tab is observed for document loading. On a
channel error, a missing-tab response establishes closure. A loading signal is
recorded as loading, not proof of navigation; other lookup errors remain unknown.
Existing `reason`, `errorCode` and
`completedCount` fields retain this evidence through the current backend
normalizer. Genuine failures remain blocking. No new permission or backend
change is required. Generation, retries, credits, auto-save and batch recovery
logic are unchanged.

Thirteen initial candidate runs passed: three each of normal review, closure, reload
and worker termination, plus normal replace. Photos and originals were retained
in review mode; replace mode applied the generated fields. No Save clicks or
photo-input changes occurred. Interrupted runs did not replay generation or
start remaining items. Failure feedback remained visible beyond three seconds.
The final diagnostic labels additionally passed three actual reload runs and a
closed-tab run. A unit regression also verifies that a failed tab lookup does
not falsely claim the tab closed.

## Limits and evidence

These runs loaded the extension in actual Chromium with genuine worker,
messaging, tab visibility and local clothing JPEGs. Marketplace DOM, account,
capacity and model responses were local fixtures. External hosts were blocked.
No paid generation, live Vinted save, affected native device or exact customer
photo contents were tested. This does not certify current live Vinted DOM or
establish historical recovery.

The background regressions and browser feedback regression failed before
the correction and passed afterward. Browser traces, screenshots, package proof
and backend normalization results are summarized in
`/tmp/autolister-wardrobe-follow-through-2026-10-17/reproduction-summary.json`.
Required full gate and actual Store delivery must be verified before claiming
the correction delivered.
