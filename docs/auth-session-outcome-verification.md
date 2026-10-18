# Background auth outcome tracking

2026-10-19. Observation only. Login decisions, refresh timing, generation,
uploads, credits, content UI and permissions are unchanged.

The gap was reproduced in the loaded extension: a failed startup refresh
followed by a successful renewal produced no durable session outcome in the
account log. The regression failed before the observer was installed. The
backend endpoint regression also failed before the new business event was
registered and retained.

After a refresh failure, one local diagnostic marker retains the owner,
original refresh operation, start time and failure count for at most 24 hours.
It contains no tokens, email, photos or listing contents. A subsequent success
on the same owner and browser emits one `auth_session_result`:

- `silent_renewed`: a refresh succeeded and its session was persisted.
- `signed_in`: the explicit OTP or extension callback handoff succeeded.
- `signInRequired` is true only after a confirmed refresh-session rejection.
  A fresh sign-in following a temporary network failure is not labelled required.

The original failed operation remains `operationId`. Silent renewal also carries
the successful `authRefreshOperationId`. The existing transport supplies the
analytics client ID, client extension version, occurrence time and stable event
ID. Authenticated ingestion retains that metadata, verifies ownership and
deduplicates retries. These business records create no incident, email or
watchdog. Ordinary successful renewal without a preceding failure emits no
additional session record.

The marker and a prepared outcome survive worker restart. The same outcome ID
is reused if queue admission fails or the worker stops after enqueue. Account
changes cannot resolve another owner's marker. SDK `TOKEN_REFRESHED` is observed
after session persistence; explicit sign-in and refresh calls are distinguished
without interpreting the SDK's general `SIGNED_IN` notification as fresh login.
Observation failures cannot change authentication results.

Loaded Chromium checks use the actual MV3 worker, bundled auth SDK, native photo
input, extension messages, storage and worker termination. Auth/provider/model
responses and the marketplace DOM are local controlled fixtures. No production
collector events, paid generation or live marketplace actions are used.

The checks cover silent renewal after restart, autonomous SDK renewal, explicit
fresh OTP sign-in, expired-token full-tab callback handoff, confirmed
rejected-session sign-in and ordinary renewal with no extra record. All six
passed three times in source and again in the actual 37-file packaged 1.4.21
extension (18 source and 18 packaged checks). Photos remain present and these background cases
send no Generate request. Unit checks cover account isolation, expiry, stable
delivery identity and fail-open storage. Endpoint checks use the actual
ingestion function and local PostgreSQL-compatible storage to verify retention,
deduplication, ownership and absence of incidents/watchdogs.

Evidence: `/tmp/autolister-auth-session-2026-10-18/`. Production availability and
natural customer observations must be recorded separately. This change cannot
reconstruct a historical silent renewal that was not retained.
