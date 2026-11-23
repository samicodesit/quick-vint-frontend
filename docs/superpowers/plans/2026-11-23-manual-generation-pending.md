# Manual pending generation implementation plan

Execution: inline, as explicitly authorized by the monitoring task. No subagents.

Goal: a manual Generate retry encountering the exact saved request still in progress should retrieve its result without reporting a final generation error or spending another credit.

Design: reuse the existing idempotency key and payload, wait only for the finite generation_in_progress or generation_commit_pending responses, and bound this wait to two minutes. Keep the existing ordinary network retry budget. Check account and listing/photo/settings scope before retry and before applying results. Do not add UI copy, services, permissions or new server retries.

Alternatives: requiring another seller click preserves identity but causes the demonstrated error; changing server idempotency is unnecessary. Bounded client continuation follows the existing batch pending-response contract.

Files: content.js; tests/e2e/manual-generation-pending.spec.js; existing uncertain request tests only where their setup depends on pending being terminal.

- [x] Reproduce on the actual public1.4.44 loaded extension with one existing DOM image, a lost first reply, pending idempotency response and cached completion. Capture a failing regression three times.
- [x] Implement the smallest bounded manual pending-response continuation. Add coverage for account/photo/settings changes, repeated pending timeout, ordinary409conflict, worker recovery, and manual network retry budget.
- [ ] Run targeted timing/lifecycle cases three times, full npm test, production build and combined diff review inline. Preserve auth, cancellation, owner isolation, photos, idempotency and credits.
- [ ] Commit only owned files; integrate deliberately onto main and use push:production. Inspect actual Store status before the authorized upload-and-submit pipeline, never replace a pending submission. Verify delivered/public artifacts or retain precise Store review dependency.

Historical boundary: production proves an exact in-progress response was shown as an error and the same request was retrieved later. Controlled lost-response tests do not establish why the customer's first response was unavailable.

Verification before the production gate: 196 unit tests passed. Native targeted runs passed42checks including3real two-minute deadlines, then45checks including3rounds of automatic401renewal with unchanged and changed listing scope. Actual public44red and corrected edit-form renders are saved in the workspace incident evidence. No paid model, production collector test or live marketplace action was used. Full production and Store gates remain separate required steps.
