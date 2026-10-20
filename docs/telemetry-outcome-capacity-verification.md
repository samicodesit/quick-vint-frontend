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
## First-failure facts carried by recovery

During final verification, production recovery `90af26ed-9008-4e84-b66b-2860a30aaf62`
from client 1.4.22 referenced operation `253e4aca-9709-4561-9342-c647a6d1bbdf`.
Exact lookups across retained groups, all-owner ingest receipts and the verified
owner's bounded log timeline found its recovery receipt but no original failure
receipt. The later read was more than 30 minutes after recovery. Endpoint logs
do not expose the original event body or establish which client made other
requests. The customer's local queue and pre-ingest rejection response are
unavailable, so the original delivery cause is not established.

Three checks on the released 1.4.22 source exercised real Chromium workers,
retained photos, two worker restarts and unmodified native retry delays. Recovery
arrived before its original failure, which later arrived successfully. This
establishes that retry ordering can produce a temporary gap; it does not prove
the customer's historical cause. The raw driver's `nativeBackoffMsAtOutcome`
field was computed after the final wait and is not used as an outcome-time
measurement.

The bounded observation now preserves the first observed failure's time, client
ID, extension version, event, error code/name, phase, status and online flag. It
carries these facts on the existing recovery event. Later attempts and upgrades
cannot replace them. Older pending observations omit unavailable facts. Only
allowlisted metadata is stored; error messages, credentials and session objects
are excluded. The existing owner checks, 24-hour expiry and authentication
decisions remain unchanged. Metadata lookup failure does not discard recovery.

The released browser fails the new self-contained-facts assertion. The corrected
loaded extension passes three rounds with a controlled collector withholding the
separate failure receipt, a real worker restart, one retained photo and zero
generation requests. This is a capture-contract check with isolated services,
not a reproduction of the customer's network or lost-receipt cause. Server
contract checks verify that ingestion retains the new bounded fields.

No migration, permission or product UI is added. The email policy and cleanup
index remain separate and held under their existing approvals and rollout gates.
