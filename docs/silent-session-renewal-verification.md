# Silent session renewal verification

2026-10-18. Local correction based on `7311ca3`. No Store upload, submission,
version bump, production event or paid generation was performed.

## Runtime changes

- `background.js`: use access credentials with more than 30 seconds remaining
  immediately while renewing near expiry. Withhold expired or rejected access
  credentials during temporary renewal failure. Preserve the saved session on
  SDK-generated sign-out from provider failures. Explicit sign-out, documented
  session rejection and account deletion still clear it.
- `content.js`: retain the pending Generate action during unavailable renewal
  or an interrupted worker message. Reuse the existing loader. Show brief
  connection feedback only after failure, with an explicit retry after a
  prolonged outage. Check owner, photos and settings before continuing.
- An initial generation HTTP 401 permits one silent renewal and replay of the
  exact saved request ID and body. Existing uncertain-response replay is retained.
  A second 401 stops without claiming that the saved session was rejected.
- Action records distinguish `background_unavailable` from `session_missing`.
  Normal successful use gets no new banner or helper text.

## Reproduction and native checks

Before the fix, native Chromium reproduced a timeout ending the pending click,
a provider HTTP 500 clearing the saved session, and termination of the actual
MV3 worker causing a false sign-in prompt. Regressions failed for those causes
before the corresponding corrections. Documented rejected-session codes were
also checked against the real bundled SDK, including its
`AuthSessionMissingError` conversion.

Thirteen scenarios passed three times each, with three additional repetitions
of the worker transport-attribution assertion:

| Scenario | Verified outcome |
| --- | --- |
| Valid access, stalled renewal | Generate completes without waiting for auth, under five seconds with local model response |
| Expired access, real SDK timeout | No generation before renewal; original click continues after connection returns |
| Initial HTTP 401 and rapid double click | Two HTTP calls, one request identity, one authorized generation |
| Worker terminated during credential fetch | Original click resumes, with `background_unavailable` recorded |
| Lost successful generation reply after renewal | All three HTTP calls reuse the exact body and ID; one modeled commit identity |
| Repeated HTTP 401 | One auth replay, then explicit retry; retained session is not falsely signed out |
| Missing refresh token at provider | Sign-in required, photos retained, no generation |
| Missing provider session | Sign-in required, photos retained, no generation |
| Provider HTTP 500 | Saved login retained; pending click resumes after provider recovery |
| Account changed during renewal | No generation or overwrite under the previous account |
| Normal Sign out command during renewal | No session resurrection or generation |
| Settings changed during renewal | Old settings are not generated |
| Stop during batch renewal | No generation replay; photos and stopped checkpoint retained |

Separate auth correlation coverage checks changed photos, background-only
failure, same-action recovery, unavailable telemetry and saved uncertain payloads.
The three actual timeout observations each recorded approximately 40.2 seconds,
including the SDK's internal retry. The transport's existing 20-second request
deadline was not changed.

## Verification gates

- Targeted native runs: 39 passed, plus 3 worker-attribution repetitions passed.
- Backend generation/idempotency endpoint tests: 31 passed.
- Backend event ingestion tests with local PGlite: 29 passed.
- Full `npm test`: 143 unit tests passed; 311 browser tests passed, 2 skipped.
- `npm run build:prod`: passed.

The two existing opt-in skips in `extension.spec.js` are the October 3 rejected
upload fault reproduction and `incident7067: batch resume preserves the committed
generation identity`. They were not enabled for this run. The nine current
`batch-request-replay.spec.js` checks passed, including exact replay of a committed
generation after lost responses in a new work tab.

The existing event context allowlist retains `reason`, action and generation IDs,
and refresh references. HTTP 401 exits the generation endpoint before credit
reservation. Backend, billing, upload, permission and dependency code is unchanged.

## Evidence and limits

Detailed local evidence: `/tmp/autolister-silent-renewal-2026-10-18/`.
`verification-summary.json` records scenario counts, request identities, action
outcomes and source hashes. Test output is in `/tmp/silent-renewal-*.log`.

Real: loaded MV3 extension, bundled Supabase SDK, native browser fetch deadlines,
file input, retained clothing photo, Chrome messaging/storage, worker termination,
Generate button, Stop and local UI screenshots.

Controlled: synthetic account/session, local marketplace fields, deliberately
held or rejected auth transport, generation responses and telemetry receipts.
The server replay model is supplemented by the unchanged backend idempotency
endpoint tests. These runs do not exercise live charging or prove customer
recovery. No production collector events were fabricated.

Untested: native Orion/iOS, the original customer's network cause and historical
same-client recovery. Current passing tests do not resolve that historical alert.

Review was inline under the current routing instruction. The Store release and
publication state were not modified. Delivery remains separate from local QA.
The final runtime diff passed whitespace checks. Manifest, Store marker, popup,
callback and backend files are unchanged. Remote main still matched the base
commit when checked before local commit.

Auth rejection reference:
[Supabase error codes](https://supabase.com/docs/guides/auth/debugging/error-codes).
