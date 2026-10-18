# Silent session renewal implementation plan

> Execute inline with test-first development and fresh verification.

**Goal:** Renew silently, preserve photos and generation identity, and request sign-in only for a rejected or missing saved session.

**Architecture:** Background credential retrieval returns a still-valid access token immediately while renewing near expiry. Expired credentials wait for the existing shared renewal. Content distinguishes retained but temporarily unavailable credentials from a missing session and retries renewal within the existing generation loader. One explicit generation HTTP 401 permits renewal and replay of the exact request ID and body. Ambiguous generation outcomes retain the existing replay policy.

**Tech stack:** MV3 background/content JavaScript, Supabase SDK, Node tests, native Chromium Playwright journeys.

**Spec:** User-approved flow in this conversation, 2026-10-18.

## Constraints and review focus

- Do not upload, replace a pending Store submission, change permissions or call paid generation.
- Preserve photos, cancellation, account isolation, idempotency and action telemetry.
- No routine auth banner or redundant helper copy. Only prolonged actual network blocking gets brief feedback.
- Check concurrent requests, account/sign-out changes while renewing, invalid refresh credentials, HTTP 401 replay, and lost generation replies.

## Steps

- [x] Add background regressions for the valid-token fast path, expired-token withholding, transient status, explicit forced renewal and account ownership.
- [x] Watch those tests fail, implement the credential contract, then rerun them.
- [x] Add native loaded-extension regressions for silent expired-token recovery, 401 exact replay, invalid-session sign-in, account changes and retained photos. Watch the causal failures before content changes.
- [x] Implement bounded credential waiting and one explicit-401 auth replay using existing generation identity, cancellation and ownership checks.
- [x] Repeat lifecycle/network journeys three times, including real SDK timeout and worker recovery. Inspect screenshots and retained evidence.
- [x] Run full npm test and production build, inspect the combined diff and update incident evidence. Leave Store delivery untouched.

## Implementation findings

- A real SDK timeout originally ended the pending click. The correction retains the click while credentials are temporarily unavailable.
- The actual bundled SDK emits SIGNED_OUT on an auth HTTP 500. Product session removal now requires an explicit sign-out or confirmed session rejection. USER_DELETED remains authoritative.
- Rejection classification uses the documented codes and the SDK's AuthSessionMissingError conversion. A legacy invalid-refresh message is accepted only with HTTP 400.
- Native recovery tests cover exact request identity, lost replies, rapid clicks, retained photos, changed settings/photos, account changes and Stop.
- Actual termination during an in-flight credential message returns undefined. It now retries safely and records background_unavailable, distinct from a missing session. The original click resumed in three native repetitions.
- Execution and review stay inline under the user's current routing policy. No Store upload, submission or version change is part of this task.

## Results

143 unit tests passed. 311 browser tests passed; two existing opt-in historical
incident reproductions remained skipped. The 39 repeated auth checks, three
additional worker-attribution repetitions, 31 backend idempotency checks and
29 backend event-ingestion checks passed. Production build passed. Detailed
scope and evidence are in `docs/silent-session-renewal-verification.md`.
