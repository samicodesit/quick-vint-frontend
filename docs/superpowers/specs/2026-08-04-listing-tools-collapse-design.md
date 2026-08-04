# Listing Tools Collapse Design

## Goal

Let sellers hide the AutoLister controls on Vinted create and edit pages without making the extension disappear.

## Interaction

- The shared listing tools start expanded on first use.
- A quiet chevron button collapses the whole action and preference area.
- The collapsed state leaves one branded `AutoLister AI` gradient capsule with a clear expand chevron.
- Clicking the capsule restores the existing controls.
- The choice is stored once and shared by `/items/new` and `/items/:id/edit`.
- State restoration does not play the full transition; user-triggered changes do.
- Keyboard focus, `aria-expanded`, `aria-hidden`, and reduced-motion behavior remain correct.

## Implementation

Reuse the existing `.quickvint-tools` wrapper and its existing controls. Add one expanded shell, one collapse button, and one compact button. A single CSS class controls both states; Chrome local storage holds the preference. No new control implementations, dependencies, background messages, or page-specific branches.

## Verification

After visual approval, add one focused browser regression covering the default, persistence across create/edit pages, and keyboard-accessible restoration. Do not add screenshot tests.
