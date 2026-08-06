# Release Widget and Batch Recovery Design

## Goal

Ship the current extension release with a small welcome-page update widget,
cleaner batch guidance, recovery routing that leads users back to the correct
tab, and review prompts only for batches that completed without interruption.

## Welcome-page update widget

The localized `/welcome/{lang}` page shows a compact release pill near the page
chrome without covering the welcome content.

### Closed state

- Text only; no decorative icon.
- Primary label: `AutoLister AI`.
- Secondary label: `UPDATE · 6 AUG 2026`.
- Use a restrained indigo-to-teal tint and slim color seam.
- The date remains visible before the widget is opened.
- The closed state cannot be dismissed before its details are viewed.

### Open state

- Header: `AutoLister AI`, `What’s new`, and `6 August 2026`.
- A close button appears after opening.
- Use small title-aligned indigo dots, not checkmarks.
- No footer or “viewed” message.
- Show exactly these three plain-language notes:
  1. **Continue an interrupted batch** — If Chrome stops it, pick up after the
     last finished listing.
  2. **Phone and computer together** — Choose either upload method from the
     same button.
  3. **More room while listing** — Collapse the AutoLister tools whenever you
     want a cleaner page.

Opening the widget immediately stores a release-specific seen value in local
storage. It remains visible for the current page so the user can read and close
it, but it does not return on later welcome-page visits in the same browser
profile. Closing also stores the same value. Reuse the existing welcome-page
styling and localization structure; add no dependency, API, or database state.

## Batch guidance

Keep the batch-controller modal unchanged. In the compact
`#quickvint-batch-tab-status` loader shown above the listing fields on every
generated work tab, add one secondary line while its state is `loading`:

> Keep Chrome open

Do not show the line in success or error states. Do not add more explanation or
warnings about normal browser activity. Change only `showBatchTabStatus()` and
its batch-specific `#quickvint-batch-tab-status` styles. Do not change the
shared `.quickvint-generation-action` loader, manual generation, phone upload
loaders, or wardrobe rewrite status.

## Recovery location and routing

The original Vinted create tab remains the batch controller and owns the full
recovery modal. Generated listing tabs must not become batch controllers.

When an interruption is detected:

1. The original controller tab shows the existing recovery modal.
2. A generated batch tab shows a compact `Batch interrupted` prompt with a
   `Return to batch` action.
3. The action focuses the original controller tab.
4. If the original tab no longer exists, the extension opens a fresh Vinted
   create tab, rebinds the saved recovery to it, and shows the recovery modal
   there.

The extension validates the saved batch and calling tab before focusing or
rebinding anything. It never overwrites a generated listing or clicks Vinted
Save/Publish.

## Clean-batch review prompt

Persist a batch-level `hadIssues` flag with the existing recovery checkpoint.
It starts `false` and becomes `true` after any worker restart, generation error,
interruption, or resume attempt. It never returns to `false` for that batch.

Show the `Impressive, isn’t it?` review prompt only when the batch reaches done
with `hadIssues === false`. A recovered or resumed batch still shows its normal
completion state but never shows that review prompt.

## Verification

- Welcome widget: closed, opened, dismissed, refreshed, desktop, mobile, and
  local-storage-unavailable cases.
- Batch review: clean success shows the prompt; interrupted, failed-then-resumed,
  and worker-restarted success do not.
- Recovery routing: source tab present, source tab backgrounded, source tab
  closed, unrelated tab, expired recovery, and repeated clicks.
- Real browser flow: interrupt after item 1 of 2, see the nudge on the generated
  tab, return to or recreate the controller, resume item 2, and verify zero
  Save/Publish clicks.
