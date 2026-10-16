# Batch flow reliability implementation plan

Execution: implementation inline under the user's existing authorization. The user separately requires a fresh independent reviewer after implementation and verification finish.

Goal: ordinary loading and brief connection loss continue the existing batch automatically, preserving photos and a single generation outcome per item.

Spec: `docs/superpowers/specs/2026-10-16-batch-flow-reliability-design.md`.

## Global constraints

No new services, migrations, extension permissions, paid AI, live Vinted actions, credentials or customer contact. Preserve unrelated work. No bearer tokens in recovery checkpoints. Existing backend replay and credits remain authoritative. Full repository gates and three real-browser rounds are required before delivery.

## Review focus

- A completed server request whose response is lost must not charge or generate again after a new work tab or worker.
- Changing accounts during waiting must not execute saved photos or replay another account's result.
- A checkpoint write failure, duplicate message or late reply must not reset completion or start another item.
- A user closing or editing a tab must not cause an automatic reload or overwrite of their work.
- Slow, progressing uploads and suspended hidden tabs must not be mistaken for failed work.

## Tasks

- [x] 1. Prove readiness and hidden-field defects with loaded MV3 browser tests. Repair readiness around actual form controls and inspect successful hidden-tab field values. Preserve foreground mismatch checks. Run targeted cases three times and relevant existing journeys.
- [x] 2. Turn the current batch-resume red regression into durable request replay. Add account-bound, item-bound prepared-request checkpoint APIs, serialize writes, and reuse the exact request across retries and work-tab recreation. Test failed storage, duplicate and late messages, account changes and signed URL refresh. Do not change backend hashing or weaken replay validation.
- [x] 3. Add active connection waiting and single-runner reconciliation to the batch worker/content boundary. Reuse existing work when safe, recover worker interruption automatically, classify transient versus terminal errors, and preserve explicit stop/cancellation. Test offline/reconnect, missing listeners, held page resources, worker restart, closed work tabs and no duplicate photo injection, three rounds each.
- [x] 4. Repair phone transport waiting with an idle-progress deadline, bounded backoff, retained file order, automatic retry and calm UI. Keep metadata idempotency, stop and expiry behavior. Add real local HTTP/socket-loss and reconnect journeys, including progressing slow uploads and telemetry volume assertions.
- [ ] 5. Review combined behavior and diff. Run required frontend and backend full gates, browser journeys and production builds. Fix substantive findings through red/green tests. Commit only owned changes, deliver through production pipelines and the Store, and verify actual artifacts/status. Record any review or delivery still pending.

Each task follows test first, observed failure, smallest coherent change, targeted verification, then full relevant gates. The ledger records decisions, evidence and remaining work. Temporary profiles, copied test files and traces are owned and cleaned after their purpose is complete; retain source regressions and compact QA evidence.

## Mandatory manual browser acceptance before publication

The user explicitly requires the primary agent to operate and inspect both single and batch journeys in the browser before any publication. Automated checks alone do not satisfy this gate. Exercise the actual loaded extension with retained photos, foreground and background tabs, worker interruption, brief offline/reconnect, slow progressing uploads, cancellation, and terminal errors. Inspect the rendered UI at each meaningful transition and confirm the resulting photos, fields, progress, cleanup and request identities. Include a normal multi-item batch and normal single upload/generation journey. Record the observed result and evidence for each case, and fix and repeat failed cases before release. External AI and marketplace actions remain isolated. Controlled faults establish recovery behavior, not the historical customer's physical network cause. Native Orion/iOS and live marketplace behavior cannot be certified by Chromium fixtures.
