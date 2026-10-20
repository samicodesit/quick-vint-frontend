# Auth outcome capacity follow-through

Production investigation on 2026-10-20 found 415 capacity evictions from one
verified browser: 121 refresh failures, 290 refresh starts, three session
outcomes and one refresh success. Two hundred delayed carriers used 1.4.21;
the final silent-renewal outcome used 1.4.22. Exact historical lost outcome IDs
were not included in the bounded counters and cannot be reconstructed. This
does not establish a failed Generate, lost photos, a duplicate charge or a
continuous signed-in UI. No customer reports were in those recorded evictions.

The released queue reproduced the tracking defect. Repeated unsuccessful sends
froze drop metadata on more queued entries, eventually protecting repetitive
diagnostics from eviction. Business auth outcomes could also be selected as
routine victims. The background session observer already supplies its explicit
critical flag; that flag alone does not prevent carrier saturation.

The correction preserves distinct auth outcomes ahead of routine events, keeps
blocked and recovered outcomes distinct, and freezes one outstanding drop
carrier per owner. Further totals remain durable in storage. They attach after
the frozen carrier is acknowledged or to subsequent ordinary activity when no
other queued event remains. Frozen payloads are never rewritten after a send.
Queue size, byte caps, retry delays, batching and account ownership are retained.
Login behavior, product UI, generation requests and credit handling are unchanged.

Regression evidence is in `test/telemetry.test.js` and
`tests/e2e/telemetry-outcome-capacity.spec.js`. The latter loads the real extension
in Chromium, uses its background queue and chrome.storage, closes and reopens
the browser, and reconnects to a local HTTP acknowledgement collector. It loses
one acknowledgement and checks accepted IDs plus reported or pending drop counts
against every emitted fixture event. It also checks that totals surviving the
last carrier survive another restart and are delivered on subsequent activity.

The prolonged outage is compressed under test control. After one real
disconnected attempt, repeated immediate transport failures represent the
remaining outage. The outage retains real retry deadlines. During reconnect,
only the disposable profile's retry alarm is disabled and retry deadlines are
advanced at quiescent boundaries after joining the worker's active flush. This
prevents fixture writes racing production queue transactions. Outcome inputs
and account credentials are fixtures. External services are isolated. These tests reproduce the queue loss,
not the historical customer's network trigger or a real provider renewal.
They do not certify native Orion/iOS behavior or historical recovery.

The corrected browser driver fails on the archived released 1.4.22 source and
passes three serial rounds on the correction (5.4 minutes). All 22 targeted
queue tests pass. The isolated backend source plus the shared corrected asset
passes its full gate: lint, types, build, formatting and 1,069 tests, with 13
existing skips. Full delivery gates and Store evidence are recorded with the
release artifacts below.

Release evidence and natural-customer correlation are recorded separately in
the parent workspace under `ops/evidence/triage-2026-10-20T1107/`. The historical
missing outcomes remain missing after a correction ships. Existing saved reports
and genuine diagnostics must remain visible. The pending server email-policy
migration is a separate change and is excluded from this delivery.

The first Store CI run stopped before upload on a 90-second worker-restart
timeout. Its trace was not retained, so that exact historical wait remains
unproven. Three individual reruns and three complete local auth-group rounds
passed. An isolated CI workflow then retained traces and exposed two separate
fixture races: a legitimate background usage refresh completed before the
intended voluntary sign-in or first rejected Generate request.

The auth fixtures now keep renewal disconnected through voluntary sign-out and
worker restart, verify that sign-out completed, and deliberately return the
first Generate HTTP 401 even when a prior refresh already succeeded. The test
still requires HTTP 401 then 200, identical request identity and body, retained
photos and the correct recovery classification. Product authentication code is
unchanged. Fifteen targeted local checks passed across three rounds. Cloud
rechecks and the final release gates remain recorded in the parent evidence.
The release workflow also retains failed browser traces for three days so a
future timeout has an inspectable wait instead of only a whole-test deadline.
