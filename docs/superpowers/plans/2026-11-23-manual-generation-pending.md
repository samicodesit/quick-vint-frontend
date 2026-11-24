# Manual pending generation implementation plan

Execution: inline, as explicitly authorized by the monitoring task. No subagents.

Goal: a manual Generate retry encountering the exact saved request still in progress should retrieve its result without reporting a final generation error or spending another credit.

Design: reuse the existing idempotency key and payload, wait only for the finite generation_in_progress or generation_commit_pending responses, and bound the pending send loop to two minutes. Subsequent pending requests and response-body reads use the remaining abort deadline. Keep the existing ordinary initial-network and separate auth-renewal budgets. Check account and listing/photo/settings scope before retry and before applying results, including after401renewal. Do not add UI copy, services, permissions or new server retries.

Alternatives: requiring another seller click preserves identity but causes the demonstrated error; changing server idempotency is unnecessary. Bounded client continuation follows the existing batch pending-response contract.

Files: content.js; tests/e2e/manual-generation-pending.spec.js; existing uncertain request and oversized prepared-byte tests only where their setup depends on pending being terminal.

- [x] Reproduce on the actual public1.4.44 loaded extension with one existing DOM image, a lost first reply, pending idempotency response and cached completion. Capture a failing regression three times.
- [x] Implement the smallest bounded manual pending-response continuation. Add coverage for account/photo/settings changes, repeated pending timeout, ordinary409conflict, worker recovery, and manual network retry budget.
- [ ] Run targeted timing/lifecycle cases three times, full npm test, production build and combined diff review inline. Preserve auth, cancellation, owner isolation, photos, idempotency and credits.
- [ ] Commit only owned files; integrate deliberately onto main and use push:production. Inspect actual Store status before the authorized upload-and-submit pipeline, never replace a pending submission. Verify delivered/public artifacts or retain precise Store review dependency.

Historical boundary: production proves an exact in-progress response was shown as an error and the same request was retrieved later. Controlled lost-response tests do not establish why the customer's first response was unavailable.

Verification before the production gate: 196 unit tests passed. Native targeted runs passed42checks including3real two-minute retry-delay deadlines,45scope/recovery checks, then48final transport/scope checks including3real stalled-request aborts followed by exact-request recovery. The oversized prepared-byte replay passed3times with17retained photos, matching request/body and unchanged uploads, using the actual backend image helper against isolated HTTP hosts. Actual public44causal red, the pre-release in-flight deadline red, and corrected edit-form renders are saved in workspace incident evidence. These are real browser lifecycle/transport checks with local provider and collector fixtures. No paid model, production collector test or live marketplace action was used. NativeOrion/iOS and the original customer network trigger remain untested. Full production and Store gates remain separate required steps.

The initial production push passed196unit and501browser checks with13configured skips, then built and pushed5478537. Hosted Store run45287956848 stopped before packaging or upload: its retained-access auth assertion incorrectly required a parent ID when Generate had explicitly joined an existing usage refresh, and a local fixture handler read the worker during browser teardown. Match the exact refresh reference plus either parent ownership or an explicit same-action join. Cover a held usage refresh as well as the ordinary path. Stop context routing before closing the fixture worker. The old parent-only assertion fails all3native held-refresh cases; the corrected two auth paths and conflict/cleanup case pass3times each. These are test corrections, with no product auth change or suppressed active-flow assertion. Repeat the required full production gate before retrying Store delivery.
