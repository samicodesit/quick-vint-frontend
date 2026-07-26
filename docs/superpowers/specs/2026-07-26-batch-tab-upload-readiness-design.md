# Batch Tab Upload Readiness Design

## Goal

Prevent batch generation from starting work in a duplicated Vinted tab before
Vinted's native photo file input exists, while preserving phone-upload originals
as the only image source for that batch.

## Incident Root Cause

The affected batch successfully downloaded its temporary-storage files, then
failed before generation because `injectFilesIntoVinted()` could not find
Vinted's file input. The existing `BATCH_PING` readiness check only proved that
the extension content script was running; it did not prove that Vinted had
rendered its upload control.

Temporary storage supplies the original files, but the extension must still pass
those files through Vinted's native file input to attach them to the listing.

## Design

`BATCH_PING` will report two facts:

- the content script is responding;
- Vinted's configured photo file-input selector currently resolves.

`waitForBatchTabReady()` will reuse its existing 250 ms polling loop and
30-second timeout, but return only when both facts are true. No fixed delay or
new retry framework is needed.

After readiness succeeds, the existing flow remains unchanged:

1. Download the grouped originals from AutoLister temporary storage.
2. Create browser `File` objects.
3. Inject those files through Vinted's native file input.
4. Generate using the captured phone-upload storage URLs.

## Safe Failure and Source Fidelity

If Vinted never renders the input, the batch stops on the first item with a
specific readiness error. It must not call `/api/generate`, consume a generation,
or silently fall back to Vinted DOM images. The temporary upload session is not
cleaned up by the failed batch, preserving the existing retry behavior.

The existing injection guard remains as defense against the input disappearing
between the readiness response and file injection.

## Regression Test

Add one browser test that removes the fixture's Vinted file input, invokes
`BATCH_PING`, and verifies that the response reports the tab as not ready. Restore
the input and verify that the same message reports readiness.

The existing daily Windows `AutoLister DOM Canary` must also require and report
the same Vinted file input before posting a pass. This makes the real
Vinted.nl page check detect future selector or rendering regressions. Trigger
the scheduled task manually after implementation and verify its full production
log detail.

Run the complete unit suite, E2E suite, production build, scheduled canary, and
extension package workflow.

## Release

Chrome Web Store production is still 1.3.63. Clear the unpublished pending
1.3.64 marker, keep `manifest.json` at 1.3.64, and replace the unpublished
1.3.64 artifact with a freshly verified package containing this fix.
