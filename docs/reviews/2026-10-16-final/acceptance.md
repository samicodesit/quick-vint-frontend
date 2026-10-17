# Batch and single-flow acceptance

Status: local candidate. Nothing in this review establishes production delivery or historical customer recovery.

## Product contracts

- Start remains an explicit seller action. Each extension listing opens in front while preparing unless the seller has paused auto-follow, started editing, or moved to another tab.
- Brief connection loss waits and retries the same prepared request. It does not require another Start or Resume click.
- Stop and a closed work tab preserve recovery data. Explicit Resume remains available when required.
- Completion requires loaded host photos and stable generated fields. Hidden-tab waiting does not establish failure.
- Recovery and late diagnostics remain bound to the originating account, batch, item and generation attempt.
- The separate web app stays on its compact batch overview. Each ready row offers Review while later items continue. Entering a draft retains progress without automatic navigation or overwriting edits.
- Queued replacement text cannot be copied or marked as a freshly generated result. After a definitive failure, existing Copy buttons explicitly say Copy previous, preserving access to earlier work without a paid retry. The item remains Needs attention, and automatic review navigation excludes it.
- Phone upload uses a progress-based idle deadline, automatic bounded retry and explicit Cancel. A progressing upload can take longer than 45 seconds.

## Evidence available before manual acceptance

| Check | Result |
| --- | --- |
| Final frontend full production verification | Passed: 122 unit tests, 281 browser tests, two legacy opt-in skips, production build. Final focused matrix: 84 browser checks across three rounds. |
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

- The final frontend gate passed on 0d76fb4. The refreshed 1.4.17 package matches the committed source, production minified content, six shared helpers and loaded offline worker. Another totally fresh independent review is required before production delivery.
- Primary-agent manual acceptance is complete for normal extension batch, computer single, phone single, worker restart during waiting, explicit Stop/Resume, web batch early review/Copy/edit retention/Next/Mark as listed, 320px layout and web single. The 57-step screenshot review includes separately inspected real-HTTP phone fault-run screenshots. The primary chose the scripted browser actions step by step; automated suites remain separate evidence. The review caught an overloaded waiting-state calculation showing 99% and Queued. Failing regressions established this for both connection and server-commit waiting. The corrected Waiting display passed 15 targeted checks across three rounds and both pictured manual recovery variants were inspected. Exact ready counts remain visible.
- Earlier independent reviews found real blockers. The terminal checkpoint, completed-request cleanup and missing expired-controller entry point are repaired and regressed as described below. Another totally fresh independent review of the final candidate is still required.
- Production and extension Store delivery, with actual public artifact/status verification, remain separate.

## Repairs following independent review

- An actual Chromium photo-fetch interruption reproduced an immediate batch pause before generation. The repaired download path retains successful files, retries missing files within two minutes, honors readable Retry-After, and remains cancellable. Three repeated rounds cover interruption with a real worker restart, definite 404, Stop, and a controlled elapsed-clock deadline. The primary repeated the pictured waiting and automatic-recovery journey. One modeled generation, one injection, two photos and one cleanup were confirmed.
- A controlled definitive replacement rejection reproduced old output appearing fresh through Copy and Mark as listed. Failed items remain Needs attention. Existing Copy buttons explicitly identify previous text, with no automatic generation or payment. The existing footer offers Retry with its generation cost, then restores Mark as listed after success. Another regression reproduced an unresolved item appearing ready after a different item was retried. Library and batch rows now consult persisted failure state, including after reload. The primary operated the failure and successful-retry screens at 390px and 320px. The final library screenshot is separately inspected automated browser evidence.
- A controlled storage-write failure reproduced Stop failing before reaching the work tab. Stop now interrupts work even when its checkpoint cannot be saved and returns an explicit failure response. The regression passes.
- The actual visibility test failed without a Linux display and passed three rounds with Xvfb. Both GitHub workflows now provide Xvfb for browser tests. This preserves real active-tab checks.
- Helper text is omitted by default under the new workspace and repository rule. The failure screen keeps the error and a short previous-text notice. Redundant queue instructions were removed. The necessary keep-open instruction remains because the web queue runs in the browser.

## Prepared release

Version 1.4.17 is packaged from frontend 3af5f837c64f144fcec9046d3ae7e061c7b491e9, coordinated with unchanged backend 4a082c052b223c819444640d0c28fec90cde86ee. Its 35-file payload matches the validation package. SHA256: c7f2243cb83f1437c816309a040257dce044eb41eeaa00fe404fd88c5ebc83eb. No upload or production push has occurred. Actual Store query 38993029024 reports 1.4.16 published at 100%, with no submitted revision. Another totally fresh independent review must finish before production delivery.

## Existing live selector evidence

The latest available saved daily DOM-canary detail is dated 2026-10-15T16:43:02.950Z, extension 1.4.16, at `https://www.vinted.nl/items/new`. It reports passed, injected true, title text `Artikel plaatsen | Vinted`, and all required title, description, photo input, tools, Generate, Sign In, Phone and language flags true. It is historical selector evidence, not this candidate's full live behavior. The scheduled task's latest result was zero, which alone does not establish a newer successful canary. No canary or live flow was triggered for this review.

## Tracking source of truth

Extension events retain the generation attempt, batch and item joins. Mobile web uses its durable operation ID as the server request ID, joined through the authenticated request log and idempotency record. Its general analytics outcome event does not independently include the operation ID. Phone transport carries per-file operation IDs with a session-key join. Current controlled success does not establish historical recovery or credit refunds.

The primary discarded a Retry screenshot captured while the queue was still preparing, then repeated the journey until the new title, enabled Copy, enabled Mark as listed and final ready count were observed. The retained screenshot shows the completed state.

## Third-review follow-through

The third fresh review blocked the prior candidate for completed-request cleanup and expired-controller recovery. Actual Chromium red regressions reproduced both. Cleanup now preserves durable done proof until its owner-bound request is cleared, retries only local idempotent removal, and can finish on a duplicate completion or later start. Recovery deletion is conditional and shares the write queue; a separate red regression proved an old dismissal could otherwise erase a newer checkpoint.

Primary manual operation also found that returning once and then closing an expired controller removed the remaining return entry point. Controller closure now restores the existing control only for paused/expired work, with status-aware brief guidance. A completed checkpoint retained during cleanup never shows interruption guidance. The expiry screen omits repeated instructions and marks unfinished rows Expired.

The final 48-check MV3 fault/replay/owner matrix passed three rounds in /tmp/autolister-terminal-cleanup-green-v3.log. The primary repeated the expiry Return and Start new batch UI with actual foreground tabs; two prior listing photos stayed present. An earlier background-tab click timeout was corrected by foregrounding the controller. No product change was based on that automation timeout.

The backend full gate passed 994 tests with four opt-in skips. One test fixture used the database session date while production budget logic uses UTC. The fixture was corrected, then its 22 tests passed in each of two opposite timezone environments and the complete gate passed. No production budget logic or migration changed.

The frontend full run caught one stale assertion expecting the previous, longer recovery message. The assertion now checks the brief message and passed three repeated browser checks. It did not require a product change.

## Fourth-review follow-through

Concurrent Return clicks and Resume messages reproduced duplicate controllers and competing runners. Recovery controls now serialize across tabs. Conflicting buttons lock while metadata is checked. Metadata and cleanup use real AbortController cancellation with 20-second deadlines, including metadata body reading. Deadline regressions accelerate only that timer; the primary also observed the real 20-second metadata deadline and a successful subsequent explicit Resume.

Cleanup HTTP 500 reproduced loss of both local discard records. Discard intent is now durable before remote cleanup. An unknown or partially completed discard offers only Retry discard, including after reload or local removal failure. It retains the exact request until acknowledgement. It does not promise that temporary server photos survived a failed cleanup. Successful retry removes matching recovery guidance and retains existing listing-tab photos. Wrong-account or stale-batch clear messages cannot hide another recovery notice.

The primary manually confirmed one controller after Return from both retained listing tabs, disabled conflicting actions during Resume, discard-only recovery after reload, successful discard retry, and removal of obsolete Return guidance. Both prior listing photos stayed present. The pictured discard state omits redundant status rows, percentages and helper text.

A held completion cleanup reproduced unnecessary waiting after generation was already durably complete. Listings ready and Done now proceed before housekeeping; late cleanup cannot erase a later batch. The primary operated a completed two-item batch while its cleanup response was held, then used Done before acknowledgement. Separate MV3 regressions cover the following batch and exact request isolation.

Pending user discard is cancellation evidence. Its reload does not invent a second generation pause, while the original genuine rejection remains visible with its generation attempt. The final focused suites passed 45 current control/tracking/cleanup checks and 48 terminal/replay checks, each over three rounds. Six additional copy/discard checks passed after removing redundant helper text. Full frontend v9 verification passed: 117 unit tests, 263 browser checks, two legacy opt-in skips and the production build.

The primary refreshed connection waiting, Stop, commit waiting and photo-recovery screenshots on the final copy. The photo journey uses actual clothing files, controlled fetch aborts and actual worker termination. The same client heartbeat message wakes the worker. Recovery completed with two listing photos, one injection, one modeled generation and one cleanup. This does not certify arbitrary OS suspension or native iOS behavior.

The fourth reviewer withdrew the ownerless-pointer finding after confirming it matches the accepted policy: explicit fresh upload can replace inaccessible, unverifiable legacy recovery without adopting its account, reusing or deleting its server photos, or closing existing listing tabs. No such deletion or reuse was demonstrated.

## Fifth-review follow-through

A fresh background-context reproduction confirmed that wardrobe rewrite could take ownership while a batch remained durably running after worker restart. Batch Start, Resume and wardrobe admission now share a short serialized ownership check. The saved running record also blocks wardrobe admission before the first batch heartbeat. Concurrent Resume and wardrobe requests admit one runner.

Actual Chromium confirmed that an older Resume could overwrite acknowledged Stop after held metadata returned. Stop now advances a durable revision, invalidating the older Resume and stale writes. A separate regression covers Stop after Resume reserves its runner, while old guidance is being cleared. A newly demonstrated tab-readiness race is also repaired: Stop before readiness prevents generation dispatch.

The primary clicked the visible Resume and Stop controls in isolated Chromium. One exceptional stale-control check sent Stop from the authorized work-tab protocol while metadata was held. Releasing metadata started no new generation. A subsequent explicit Resume completed the same logical request with both photos. A real source-modal Stop before tab readiness issued zero generation requests and no cleanup. The primary inspected all three added screenshots.

The UI previously labelled a Resume superseded by Stop as a resume failure. It now records the existing cancellation event with the same generation attempt. The original definitive rejection stays visible. This is verified against the captured event stream, not inferred from the wording on screen.

The final focused matrix passed 105 browser checks over three rounds. The ownership suite passed 48 unit checks across three rounds. Full frontend verification then passed: 120 unit tests, 267 browser tests, two legacy opt-in skips and the production build. Another totally fresh independent review remains required before production delivery.

## Sixth-review follow-through

The sixth reviewer reproduced two blockers: losing all original tabs stranded a saved batch, and a second Resume queued before Stop could restart work after Stop was acknowledged. Both were reproduced on the loaded extension before repair. A fresh same-account create page can now reclaim the existing batch when no bound create page remains. It pauses unfinished work and offers explicit Resume or Discard, preserving the exact prepared request and photos. Concurrent fresh pages cannot both claim the controller. Expired and unfinished-discard states retain their existing restricted actions.

Root checks also reproduced an open source tab on another page being mistaken for a reachable controller. Fresh recovery and Return now check the actual create-page URL, including a pending create navigation. Review navigation and recovery change controller in the same storage write, so Back to batch reaches the restored page. A failed restoration write blocks conflicting upload rather than silently ignoring saved recovery.

Stop cancels all older queued Resume and not-yet-started Discard commands. A later explicit Resume or Discard remains usable. Late work-tab callbacks and Stop snapshots cannot overwrite a restored controller or newer progress. An already-begun discard remains durable and cannot be relabelled as safely stopped. These cross-tab race checks use controlled protocol messages from authorized extension content contexts; they are not claims that the ordinary UI exposes conflicting buttons.

One repeated expiry check read storage when the cleanup request arrived, before its response and local removal finished. The assertion now waits for checkpoint removal and the recovery screen to close. That driver correction required no product change. No permanent panel or helper paragraph was added by these repairs.

The final sixth-repair matrix passed 84 actual Chromium checks and 54 unit ownership/control checks across three rounds. The complete frontend gate then passed 122 unit tests, 281 browser tests, two opt-in skips and the production build. Root operated worker interruption, closure of every original tab, fresh-page recovery, explicit Resume and Back to batch. The exact prepared body was replayed, two logical items completed with one photo each, and actual native focus returned to the restored controller. Root also confirmed that Stop cancelled two old queued Resumes and a queued Discard without generation or cleanup, while a later explicit Discard succeeded. The new recovery screenshots were inspected. A fresh independent review is still required.

## Seventh-review follow-through

Fresh app entry reproduced loss of the web batch review order while failed drafts remained durable. Next could then open another unresolved failure. That click did not trigger generation or payment. Review order is now saved with the existing account-bound queue, limited to 20 IDs. Older queue records derive their scope from existing members. Fallback library navigation also excludes busy and failed items when page history or the queue is absent. Explicit Open and Retry remain available. No extension, style or helper-copy change was made.

Fresh, legacy and missing-queue regressions failed before the repair. The final matrix passed 12 journeys over three rounds, including a mixed failed/ready case where Next opens the ready item. Normal, queued-replacement and failed-replacement journeys passed nine runs over three rounds. A 20-item batch and the full 24-check web suite passed without page errors. The mixed-case driver waits for the actual draft to change after Next rather than reading the old visible heading immediately.

The primary operated fresh entry, Copy previous without generation, and explicit Retry. The exact review order and both photos remained. Normal Copy and Mark as listed returned after Retry, whose single-item scope hides Next. The other draft remained Needs attention. The primary inspected both new screenshots and 320px/390px bounds. The manually observed post-retry state offered no additional Next; positive mixed-result Next was checked in the three automated rounds. No product change was made for an initial manual assertion expecting a disabled button where the existing UI correctly hides it.

The API complete production gate passed again: 994 tests, four opt-in skips, lint, types, formatting and build. The unchanged extension retains its passed 122-unit/281-browser gate and exact 1.4.17 package. The 57-step walkthrough is current. Another totally fresh independent review is required before delivery.
