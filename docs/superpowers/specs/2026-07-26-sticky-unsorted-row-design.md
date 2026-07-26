# Sticky Unsorted Row

## Goal

Keep unresolved photos visible while the user scrolls grouped items, without
changing the existing batch grouping model.

## Design

Reuse the existing `.batch-gallery`; do not create a second gallery or copy
photo state.

- Keep the gallery sticky whenever unresolved photos remain.
- Constrain it to one horizontal row with four visible photos on desktop and
  three on narrow screens. Additional photos remain accessible through native
  horizontal scrolling.
- When no photos remain, keep the existing collapsed gallery and `All sorted`
  status.
- Reconcile every gallery tile's grouped/visible state from
  `batchMarkedGroups` whenever grouping controls update. This cancels stale
  hide timers and ensures an unresolved photo cannot remain hidden.

The first unresolved photos remain at the start of the row after grouping or
ungrouping. Grouped item cards scroll normally below it. Existing selection,
grouping, removal, status, and batch-blocking behavior remain unchanged.

## Error Handling

Batch generation remains blocked whenever any uploaded photo is unresolved.
The existing guard is the source of truth; the sticky row only makes that
state visible.

## Verification

- A focused browser test leaves nine unresolved photos, scrolls the grouped
  item cards, and verifies that the existing gallery remains sticky.
- The test verifies four visible photo slots on desktop, three on mobile,
  native horizontal overflow, and stable photo order.
- The test simulates stale hidden state and verifies that an unresolved tile is
  restored.
- The same test verifies that the sticky state clears after all photos are
  grouped.
- Run the full unit and browser test suite.
