# Batch Organizer Clarity Design

## Goal

Make batch upload immediately understandable: compact source choices inside the already-stable modal, one obvious scroll surface, clearly separated ungrouped and grouped content, and no non-actionable capacity filler.

## Decisions

- Keep the stable outer modal size so phase changes do not move the interface.
- Stop stretching the phone and computer source cards. On desktop, center two equal compact cards in the available body; keep the existing compact stacked mobile layout.
- Remove the sticky-photo row. All ungrouped photos stay in one normal wrapping grid, in source order.
- Keep one scroll container for the organizer and force it to reserve a visible scrollbar track. Style the native scrollbar with a high-contrast track and thumb; do not add custom scrolling JavaScript.
- Separate the organizer into two labeled regions:
  - **Photos to group**: helper copy, remaining-photo count, and the wrapping grid.
  - **Grouped items**: grouped-item count, Reset text action, and item cards.
- Replace the red count pill with a plain-text header button such as “9 photos left ↑”. It remains visible in the fixed header and scrolls the organizer back to the photo section. When no photos remain, it becomes disabled text: “All photos grouped”.
- Keep availability under the modal title. Hide the inline capacity note during loading and when capacity is sufficient. Show it only for blocking/error or partial-capacity warnings.
- Keep the grouped section visible when empty with the factual message “No items grouped yet.”

## Interaction

Selecting photos keeps the footer actions unchanged. Grouping photos removes them from the grid and appends an item card below without auto-scrolling away from the next photos. If the user scrolls through grouped items, the fixed “photos left” control returns them to the gallery.

The organizer scrolls only vertically. The document, modal frame, gallery, and grouped rows must never gain horizontal scrolling.

## Accessibility

- The header jump control is a real button with `aria-controls`.
- The photo and grouped sections have programmatic headings.
- Existing keyboard focus and 44px mobile action targets remain.
- Reduced-motion users receive an immediate jump instead of smooth scrolling.

## Verification

Browser tests must prove:

- source panels remain compact while the desktop modal stays tall;
- no sticky gallery container exists and every remaining photo stays in one multi-row grid;
- the organizer uses `overflow-y: scroll` with a nonzero scrollbar width;
- the gallery and grouped sections have separate visible bounds/headings;
- the header control returns a scrolled organizer to the gallery;
- sufficient capacity does not render “Using … available”, while limited capacity still shows the actionable warning;
- desktop and mobile modal/overflow checks remain green.
