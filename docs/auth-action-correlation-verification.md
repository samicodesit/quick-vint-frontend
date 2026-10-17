# Auth action correlation verification

This candidate changes observation only. It does not change sign-in UI, SDK
calls, token fallback, retry delays, sign-out rules, generation requests or
credits. The tested candidate is version 1.4.19, developed on
`codex/auth-action-correlation`, separate from the already submitted 1.4.18
package. Status-only checks confirmed that unchanged package PUBLISHED at 100
percent (workflows 39059952795 and 39061846872). No cancellation or replacement
of that package was performed. Delivery receipts are recorded separately in the
workspace checkpoint and `/tmp/autolister-auth-action-2026-10-17/`.

Delivery order: backend candidate `5de04c2f75e8b75f7e1e1f0b6c8c03d58e89b93f`
must reach production before the extension. It registers retention of the new
business event and allows both correlation fields. The old endpoint can
acknowledge an unknown business event without retaining its action log, which
the endpoint regression demonstrated. A client-only delivery is insufficient.

## Demonstrated gap

The actual released 1.4.17 ZIP, downloaded from release workflow 39012948783,
was loaded into a disposable Chromium profile. A near-expiry synthetic session
encountered a controlled auth network failure. Generate then received a
controlled API 401. The existing sign-in prompt appeared and the clothing photo
remained, but no event linked that blocked action to its refresh attempt.

The pre-change scheduled-refresh check also lacked caller identity. These
reproductions demonstrate missing diagnostic relationships, not the original
network cause or foreground impact of historical customer errors.

The refresh source between `scheduleTokenRefresh` and `createAuthenticatedClient`
has identical SHA-256 `56a15f63f86751b4dcc4fef89aa6dc4aea50ade70c8df5876186c2a28535a687`
in the actual 1.4.17 and 1.4.18 ZIPs. Neither background script contains the new
action event. This gap was not already fixed by the wardrobe release.

## Recorded relationships

- Refresh events retain their own `operationId` and gain the actual caller in
  `entryPoint`. A scheduled timer is labelled `scheduled_refresh`; a credentials
  request is `access_token_request`. Component source alone is not a user-impact
  classification.
- Generate allocates an action ID. `parentOperationId` links a refresh initiated
  by that action. `authRefreshOperationId` links the credential result and actual
  action outcome back to the refresh, including an existing shared attempt.
- `refresh_joined` means a foreground request joined an existing refresh.
  `credentials_returned` means credentials were returned, not that they worked.
- `blocked` requires an actual missing credential or API 401 in the action.
  `succeeded` requires successful completion of Generate. `recovered` additionally
  requires an earlier blocked action in this content document with the same
  known account, listing/batch item, photos and generation settings, within the
  15-minute retry window. A worker restart does not reset that content record.
- Different inputs, accounts, stale attempts, ordinary provider failures and
  duplicate completion callbacks cannot manufacture recovery. The actual durable
  generation attempt ID is retained when it supersedes a newly allocated ID.
- Client and server allowlists retain both correlation fields. The authenticated
  events endpoint stores action records in `api_logs`, retains transport IDs and
  deduplicates delivery through the existing SQL ingest path. The new event is
  business evidence, not a new incident, watchdog flow or email trigger. Existing
  genuine auth failures remain incidents.

## Browser cases

The permanent regression is `tests/e2e/auth-action-correlation.spec.js`:

1. The actual native scheduled timer fails with no user action. It records
   `scheduled_refresh`, zero Generate requests and no invented blocked action.
2. Clicking the real Generate button produces a controlled 401, the unchanged
   sign-in prompt and one retained photo. The existing verification message path
   succeeds after reconnect; a matching successful retry records recovery with
   the same action ID, even after actual worker termination and restart.
3. Generate joins a held background refresh. The joined event and blocked result
   reference that existing refresh, without an extra access-token refresh. A
   separate existing usage-count refresh is not treated as a duplicate join.
4. Selecting a different photo through the browser file input produces a
   different payload. Its successful generation does not recover the earlier
   blocked action.
5. A refresh fails, but retained access is accepted by the controlled API.
   Generate succeeds, and tracking does not claim a blocked user or recovery.
6. Telemetry transport fails while auth and Generate succeed. Output, request
   count, sign-in state and the photo are unaffected.

## Real, controlled and untested

Real: the loaded MV3 extension, browser file input with local clothing JPEGs,
Chrome storage, messaging, content UI, native timer, SDK execution and worker
termination/restart. No runtime/storage/message responses are replaced.
The timer test observes the worker through CDP polling, keeping it alive. It
verifies attribution when the native timer executes, not natural idle-worker
wakeup. Scheduling behavior itself is unchanged.

Controlled: the marketplace DOM fixture, synthetic account/session, auth network
rejection, verification response, API 401 and model output. All external hosts
are isolated. Verification uses the existing extension message handler with a
synthetic code; this is not proof of actual email delivery or manual code entry.
No paid generation or live Vinted action ran.

Untested: native Orion/iOS, the historical customer's network/device and recovery
after the content page itself is destroyed. The observer deliberately does not
infer that recovery from another page/device or later unrelated success.
Browser status 0 and `navigator.onLine` cannot identify a DNS/TLS/ISP root cause.
Offline or dropped telemetry cannot provide an absolute delivery guarantee.

## Verification record

Both `npm run verify:production` gates passed: frontend 137 unit tests,
297 browser tests with 2 existing skips, and production build; backend lint,
type check, build, formatting and 1,015 tests with 4 existing skips. The first
frontend attempt exposed the old ordered manifest assertion, which omitted the
new observer. Adding that required script to the expected list cleared it; the
full gate was then rerun successfully. No runtime correction was needed.

Targeted source cases passed 18/18 (six cases repeated three times). The
strengthened same-photo recovery and manifest cases passed 6/6. The actual
compiled 1.4.19 ZIP passed 9/9 checks: block/recovery, shared refresh and manifest,
each repeated three times. Raw local QA evidence is in
`/tmp/autolister-auth-action-2026-10-17/`.

The first captured retry completed before the existing error toast timed out.
The immediate recovery screenshot therefore still shows that earlier transient
toast alongside the completed fields. Its display behavior was not changed.
The final packaged captures wait for that normal timeout and show the existing
tools without the earlier toast. Both request photo payloads are asserted equal.

Repeated-run evidence (run 1):

| State | Recorded proof |
| --- | --- |
| Timer only | Refresh `37550b0f-f334-4089-a11c-46f7bf2e438f`, `scheduled_refresh`, zero Generate requests, zero action results. |
| Blocked action | Action `12f1727c-1066-4bdc-bf2b-3335a290fdd0`, `blocked`, status 401, refresh `50fac48b-55a3-4bcd-adc6-a141aac6604c`, one retained photo. |
| Exact recovery | Same action ID and refresh reference, `recovered`, second attempt, successful output after worker restart, one retained photo. |
| Background joined | Action `0d3932b6-0271-4e5c-99b4-7ea1e36d0800` first records `refresh_joined`, then `blocked`, both linked to scheduled refresh `c5903c95-9e97-4e1c-ac10-3df3570421a8`. |

`proof-summary.json` retains the compact events, IDs, timestamps and request
counts for all three repetitions. `candidate-source.sha256` identifies the local
modified code used by the full gate, initially carrying manifest version 1.4.18
solely for the isolated test. Only the candidate version then changed to 1.4.19
before the official local packaging command and packaged-browser checks.
Version alone must not be used to confuse the earlier local candidate with the
unchanged Store package.

`package-proof.json` records 36 files, the included observer and unchanged
permissions. The compiled ZIP SHA-256 is
`f0f89836bc3f4db6f33aa717be5ce28717e02d561b49be71f1161af0e635fc8c`.
The published 1.4.18 ZIP remains
`be3b8df167e561f243c4be13dfffe1712718d174999485312231e96204991594`.
Packaging alone is not proof of upload, Store approval or installed-client update.
