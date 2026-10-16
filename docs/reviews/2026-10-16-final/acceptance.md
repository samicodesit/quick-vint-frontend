# Batch and single-flow acceptance

Status: local candidate. Nothing in this review establishes production delivery or historical customer recovery.

## Product contracts

- Start remains an explicit seller action. Each extension listing opens in front while preparing unless the seller has paused auto-follow, started editing, or moved to another tab.
- Brief connection loss waits and retries the same prepared request. It does not require another Start or Resume click.
- Stop and a closed work tab preserve recovery data. Explicit Resume remains available when required.
- Completion requires loaded host photos and stable generated fields. Hidden-tab waiting does not establish failure.
- Recovery and late diagnostics remain bound to the originating account, batch, item and generation attempt.
- The separate web app stays on its compact batch overview. Each ready row offers Review while later items continue. Entering a draft retains progress without automatic navigation or overwriting edits.
- Queued replacement text cannot be copied or marked as a freshly generated result.
- Phone upload uses a progress-based idle deadline, automatic bounded retry and explicit Cancel. A progressing upload can take longer than 45 seconds.

## Evidence available before manual acceptance

| Check | Result |
| --- | --- |
| Final frontend full production verification | Passed, 117 unit tests, 244 browser tests, 2 legacy opt-in fault harnesses skipped, production build passed |
| Backend full production verification | Passed, 994 tests, 4 opt-in skips; lint, types, format and build passed |
| Established web browser suite | 24 checks passed, no page errors |
| Web early-review, queued-replacement and failed-replacement journeys | Passed three rounds each; separate earlier 20-item batch passed |
| Real HTTP phone journeys | 19 passed: socket loss, metadata interruption, Cancel, expiry, idle timeout, progressing slow upload and single-path reconnect |
| Targeted MV3 fault and tracking matrix | Repeated three times during development; final full gate recorded separately |

## Limits

The extension browser is actual Chromium with the candidate MV3 worker, storage, tab lifecycle and messaging. The page exposes the create-page selectors used by the extension, but is a controlled host fixture, not the full Vinted React application. Authentication, model responses and external storage are local fixtures. Model replay counts prove the client reused one logical request against that model; they are not production billing evidence.

Phone tests use actual browser file input, compression, multipart XHR, loopback HTTP, controlled socket termination, held responses and throttled upload. They establish transport behavior under those controlled conditions, not the physical cause of a customer's earlier failure.

Native Orion/iOS, arbitrary browser suspension, live marketplace validation, paid generation and production deployment are not certified by these checks. Photos retained locally do not establish that a marketplace listing was published.

An older saved record with no verifiable owner is not adopted by guessing an account. Existing listing tabs and photos are not deleted. A seller can explicitly begin a fresh upload. This favors account isolation over automatic reuse of unverifiable legacy recovery data.

## Remaining acceptance

- Final frontend verification passed on the recorded source: 117 units, 244 browser tests, two legacy opt-in fault harnesses skipped, production build. Package validation exposed generated-registry drift from the canonical website registry; the established sync generator repaired parity without changing the backend registry or policy. The final offline package passes shared-helper, manifest/script and loaded-worker checks at prepared release version 1.4.17. Its background and manifest match the source, and its content script matches the minified production build.
- Primary-agent manual acceptance is complete for normal extension batch, computer single, phone single, worker restart during waiting, explicit Stop/Resume, web batch early review/Copy/edit retention/Next/Mark as listed, 320px layout and web single. The 44-step screenshot review includes the separately inspected real-HTTP phone fault-run screenshots. The primary's scripted browser actions were chosen step by step; the automated suites remain separate evidence. The review caught an overloaded waiting-state calculation showing 99% and Queued. Failing regressions established this for both connection and server-commit waiting. The corrected Waiting display passed 15 targeted checks across three rounds and both pictured manual recovery variants were inspected. Exact ready counts remain visible.
- Second totally fresh independent review of the final versioned candidate and verification evidence.
- Production and extension Store delivery, with actual public artifact/status verification, remain separate.

## Repairs following independent review

- An actual Chromium photo-fetch interruption reproduced an immediate batch pause before generation. The repaired download path retains successful files, retries missing files within two minutes, honors readable Retry-After, and remains cancellable. Three repeated rounds cover interruption with a real worker restart, definite 404, Stop, and a controlled elapsed-clock deadline. The primary repeated the pictured waiting and automatic-recovery journey. One modeled generation, one injection, two photos and one cleanup were confirmed.
- A controlled definitive replacement rejection reproduced stale Copy and Mark as listed controls. Failed output is now unavailable to Copy. The existing footer offers Retry with its generation cost, then restores Mark as listed after success. Another regression reproduced an unresolved item appearing ready after a different item was retried. Library and batch rows now consult persisted failure state, including after reload. The primary operated the failure and successful-retry screens at 390px and 320px. The final library screenshot is separately inspected automated browser evidence.
- A controlled storage-write failure reproduced Stop failing before reaching the work tab. Stop now interrupts work even when its checkpoint cannot be saved and returns an explicit failure response. The regression passes.
- The actual visibility test failed without a Linux display and passed three rounds with Xvfb. Both GitHub workflows now provide Xvfb for browser tests. This preserves real active-tab checks.
- Helper text is omitted by default under the new workspace and repository rule. The failure screen keeps the error and a short previous-text notice. Redundant queue instructions were removed. The necessary keep-open instruction remains because the web queue runs in the browser.

## Prepared release

Version 1.4.17 is packaged locally. The actual Store status query reports 1.4.16 published at 100%, with no submitted revision. Packaging, shared-helper parity and the loaded packaged worker passed. No upload or production push has occurred. A second totally fresh independent review of the final candidate is required before deployment.

## Existing live selector evidence

The latest available saved daily DOM-canary detail is dated 2026-10-15T16:43:02.950Z, extension 1.4.16, at `https://www.vinted.nl/items/new`. It reports passed, injected true, title text `Artikel plaatsen | Vinted`, and all required title, description, photo input, tools, Generate, Sign In, Phone and language flags true. It is historical selector evidence, not this candidate's full live behavior. The scheduled task's latest result was zero, which alone does not establish a newer successful canary. No canary or live flow was triggered for this review.
