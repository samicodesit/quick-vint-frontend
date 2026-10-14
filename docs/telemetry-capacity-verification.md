# Telemetry queue capacity, 2026-10-14

Production recorded 202 capacity evictions, including 36 events classified
critical and zero customer-report evictions. Critical includes transient auth
diagnostics. These counts do not establish failed generations or lost photos.
The old transport did not retain the discarded event types.

At 200 events or 512 KiB, repeated critical diagnostics could evict a distinct
generation failure or customer report. Regression tests failed on the previous
policy. The queue now evicts routine evidence, then repeated diagnostic evidence,
before distinct failures. Customer reports and existing drop-count carriers have
priority. Separate operations, accounts and phone sessions remain distinct.
Periodic auth attempts can share an eviction class without merging their IDs or
pretending discarded occurrences were accepted by the server.

The real loaded Chromium extension also exposed competing message listeners:
the main handler replied with an unknown-message error before the telemetry
handler finished. The main handler now leaves telemetry replies to their owner.

Browser verification uses real extension messaging, chrome.storage, browser
shutdown/restart, offline mode and reconnection to a local HTTP acknowledgement
receiver. External services are isolated. Fixture identities and failure events
are controlled; this does not reproduce the historical customer's network cause
or verify paid generation, marketplace activity or historical recovery.

Future drop reports carry a bounded count of registered event types, with an
aggregate bucket after four types. Backend validation rejects arbitrary text and
malformed counts. Storage age, request limits, retry backoff and the bounded flush
remain unchanged. Any finite queue can still overflow during a prolonged outage;
this change protects useful evidence and explains future losses.

Regression locations: `test/telemetry.test.js` and
`tests/e2e/telemetry-durability.spec.js`. The backend endpoint tests verify durable
retention and duplicate-acknowledgement handling for the new drop metadata.
