# Retire empty manual photo sessions

## Production evidence

On 2026-10-15 at 13:28:26 UTC, client incident
`209a1dee-a0af-486e-94c6-d53e84a3844d` recorded a manual temporary-storage
failure. Backend incident `64208c14-d0c7-4312-859a-e78006e4e317` recorded a
matching list/sign failure. The bounded Vercel endpoint query contained six
requests. It showed cleanup removing five files from the exact failing session
immediately before its GET failed to sign a removed file.

The verified client account's bounded timeline contained 22 records, all read
in full. A later successful four-photo generation had another attempt ID. It
does not establish recovery of the failed upload. The historical UI gestures
were not recorded, so their exact order cannot be claimed.

## Reproduction and change

The loaded MV3 extension has a reproducible session-lifecycle defect. Add a
manual photo, append another, remove both visible photos, then add a replacement.
The captured file array is empty, but its upload object still exists. Append
registration requests cleanup of that object and then copies its session ID and
promise into the replacement upload. Cleanup and new uploads can consequently
target the same storage folder.

Clear the retired reference when registration has no existing captured files.
This preserves normal appends while giving the replacement a fresh session,
fresh promise and fresh upload error state. The JPEG encoder, photo dimensions,
quality, request concurrency, cancellation, generation, credits and account
handling are unchanged.

## Verification scope

`tests/e2e/manual-upload-session.spec.js` loads the real extension into an
isolated Chromium profile. It exercises actual file inputs, content-script
MutationObserver callbacks, native extension storage/messaging and JPEG
multipart construction. The external storage API is controlled and follows the
real contract: POST returns metadata without URLs, then GET supplies signed
URLs. The marketplace page is a local fixture. No paid generation or live
marketplace action is performed.

The test verifies that ordinary appends share their session, cleanup targets
only the old session, and the replacement upload and URL lookup use a fresh
session and order zero. The unchanged release failed that identity assertion.
The fixed build passed three consecutive runs. This reproduces the current
defect, not every historical gesture or the affected customer's recovery.

Full integration/build and production push gates are required before delivery.
Chrome Store publication is verified separately from submission.

Local `npm run verify:production` passed 112 unit tests, 204 browser tests,
one existing opt-in skip, and the production build. The reproduction also
passed three consecutive runs independently of that full gate.
