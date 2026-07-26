# Sticky Final Unsorted Row

## Goal

Keep the last unresolved photos visible until the user groups or removes them,
without changing the existing batch grouping model or making large uploads
harder to review.

## Design

Reuse the existing `.batch-gallery`; do not create a second gallery or copy
photo state.

- While more than one visual row remains, keep the current grid unchanged.
- When at most four photos remain on desktop, or three on narrow screens, add
  a compact sticky treatment to that same gallery beneath the modal header.
- When no photos remain, keep the existing collapsed gallery and `All sorted`
  status.
- Reconcile every gallery tile's grouped/visible state from
  `batchMarkedGroups` whenever grouping controls update. This cancels stale
  hide timers and ensures an unresolved photo cannot remain hidden.

The grouped item cards continue scrolling normally below the gallery. The
existing selection, grouping, removal, status, and batch-blocking behavior
remain unchanged.

## Error Handling

Batch generation remains blocked whenever any uploaded photo is unresolved.
The existing guard is the source of truth; the sticky row only makes that
state visible.

## Verification

- A focused browser test groups photos until one row remains and verifies that
  the existing gallery becomes sticky.
- The test simulates stale hidden state and verifies that an unresolved tile is
  restored.
- The same test verifies that the sticky state clears after all photos are
  grouped.
- Run the full unit and browser test suite.
