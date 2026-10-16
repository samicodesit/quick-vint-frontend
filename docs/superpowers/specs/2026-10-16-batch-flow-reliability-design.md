# Batch flow reliability

The user authorizes an integrated repair of the existing batch experience, implemented inline. One start action should progress quickly without requiring users to resume ordinary tab loading or transient network failures. Keep existing product paths, photos, cancellation, account isolation, generation and credit behavior. No paid generation, live marketplace actions, new permissions, migrations or services are authorized for verification.

## Evidence

- Production incident 7067f108-8baa-4199-ac61-343f5e67ad6f: item 3 of 10 lost its client response while its exact API request completed successfully. Resume generated the same eight storage objects again. Item 4 subsequently hit the full-tab-load guard three times. Full batch completion was not established.
- The loaded MV3 regression reproduces a new request ID on Resume in three consecutive rounds. External API completion and broken connections were controlled; Chromium tabs, runtime messaging, local storage and recovery UI were real. This establishes a retry defect, not the historical physical cause of the connection loss.
- `waitForTabComplete` gates the actual form readiness check on all page resources completing. An earlier real-browser probe established that a held image can keep Chrome loading while the content listener and file input are usable.
- `waitForGeneratedListingFields` does not inspect successful field values while hidden. Background batch work therefore depends on foregrounding a tab unnecessarily.
- The phone upload page retries a failed upload twice, then requires manual intervention. Its XHR has no idle deadline. Preserve terminal diagnostics without creating retry telemetry floods.

## Design

Use the existing extension worker, content scripts, local batch checkpoint and backend request replay. Add no service or database schema.

1. Start each item when its actual create form, extension listener and upload control are usable. Do not wait for unrelated page resources. Missing, disabled or wrong-route controls are not ready. Poll without overlapping messaging requests. Slow loading remains an active waiting state with clear copy, rather than an automatic pause.
2. Successful field equality is evidence in both visible and hidden tabs. Hidden or suspended time cannot establish a field-write failure. Preserve actual mismatch diagnostics. Do not declare host photo upload successful from captured files or polling alone.
3. Before sending a batch generation, save its exact request ID and prepared payload in the current batch checkpoint, bound to the account and item. Keep only one current request. Never persist bearer tokens. On retry, tab recreation or worker restart, reuse that payload and ID, even if refreshed signed URLs differ. The existing backend replay remains the authority for completed generation and credits. A failed checkpoint write prevents a new generation.
4. Transient connection errors and an in-progress generation are active waiting states. Continue the same item automatically with bounded backoff and no new request identity. Respect server retry delays. Do not retry validation, sign-in, account limits, cancellation or expired photos as network failures. Continue promptly when connectivity returns. Keep the same work tab where its ownership and state are intact; never inject photos twice into an unrelated or edited tab.
5. Worker recovery reconciles saved progress and any still-running content task before continuing. One runner per batch, one generation per item, and monotonic completion checkpoints. A different signed-in account cannot execute or replay a saved batch. Old checkpoints without an account binding require explicit recovery rather than guessing ownership.
6. Phone uploads preserve each file and order during a network interruption and continue automatically. Show calm connection waiting copy with a stop control. An idle deadline resets only on real transfer progress; it must not abort a progressing slow upload. Metadata confirmation uses the existing idempotent session contract. Cancellation and session expiry stop retries. Aggregate repeated network diagnostics rather than flooding the queue.

## Limits and safety

- The original network or Vinted resource failure cannot be retrospectively identified from a generic browser fetch error. Do not claim otherwise.
- Keep pending prepared payload storage bounded by the existing generation body limit, with one item per batch and the existing six-hour recovery lifetime. Photos and generated text stay out of telemetry.
- Normal work has no artificial retry delay. Polling and backoff apply only while a dependency is unavailable. Existing review spacing is preserved unless measurements justify changing it.
- No blind regeneration after an uncertain server result. No automatic reload of a tab with user edits. No failure suppression to quiet genuine incidents.
- A prolonged outage, expired photos, invalid input or a required sign-in can still need an explicit user action. State the concrete reason calmly.

## Review navigation and local preview

The user delegates the navigation decision and requests a working local flow to preview with minimal clicks. Sellers group their photos and start once. Latest clarification: enter each new listing tab as it opens so the seller can watch photos upload and generated text appear. Create it inactive, then deliberately activate only while the seller remains on the controller or an unedited batch listing. Completion must not trigger another focus change. Typing, focusing an editable field, switching elsewhere or explicitly choosing a listing protects the seller's current tab. Preparing another item cannot overwrite an earlier item's edits. Automatic following can be resumed explicitly. Next ready listing is optional after following has paused, never a required step in the normal path.

While the current batch item prepares, its title and description are temporarily read-only to prevent an arriving response overwriting user input. Restore the prior read-only and aria-busy values in every success/failure path. Other host fields remain available. Finished listing fields stay editable while later items prepare. Verify the actual loading tab is foreground before the controlled API response is released, then confirm normal completion, restored fields and protected edits/other-tab focus.

Reuse the existing per-listing status banner for ready count, optional following controls and Back to batch. Do not add a second block with duplicate status copy. Ready rows on the controller open their corresponding tab. Navigation remains available after generation completes. Defer the existing Store review prompt until the seller explicitly dismisses the completed batch screen, rather than blocking the final listing. Organizer scrolling uses overflow auto and a thin neutral indicator only when content overflows; keep all groups and the start action reachable in shorter windows.

Verify using the actual loaded extension and real Chrome focus, with external marketplace and AI services isolated. The preview must visibly identify itself as local and use no real account or paid generation. Broader reliability release gates remain outstanding until separately completed.

## Acceptance

Real loaded-extension journeys must prove usable loading tabs, hidden-tab completion, lost response replay, worker interruption, tab recreation, account switching, cancellation, local checkpoint failure, network reconnect, and photo retention. Repeat timing/network/lifecycle cases three times. Use actual local HTTP/socket interruptions where transport matters. External Vinted and AI actions remain isolated and explicitly labeled. Assert model/credit-equivalent commits occur once per logical item, not merely that a loader disappears.

Run frontend unit and full browser suites and production build. Run backend/site full integration, lint, types, build and formatting gates for phone-page changes. Review the combined diff, then use production push pipelines and established Chrome Store upload-and-submit gates. Verify the actual uploaded artifact and production assets. A pending submission must not be replaced. A failing check or unresolved behavior/account/credit safety blocks delivery.
