# Generate Button Mirage Loader

## Goal

Replace the Generate button's conventional busy spinner with the approved
Mirage animation while a listing is being generated.

## Behavior

- Idle state remains unchanged: wand icon and `Generate` label.
- Active generation replaces the wand with a white Mirage animation and uses
  the label `Generating` without an ellipsis.
- Existing non-generation labels, success state, disabled behavior, button
  dimensions, and phone-button loading state remain unchanged.
- The animation stays on the left so the label does not shift.

## Implementation

Port the motion and geometry of UI Ball's MIT-licensed LDRS Mirage loader into
the existing content-script button markup and stylesheet, with an attribution
comment. Keep it local: Chrome extension code must not import executable code
from a CDN, and this visual does not justify a new runtime dependency.

The existing `is-loading` state will reveal the Mirage element for generation
and hide the wand. The phone button will retain its current spinner. Reduced
motion will render a static Mirage frame.

## Verification

Browser coverage will hold the generation request open and verify that the
button shows `Generating`, displays Mirage instead of the wand, and preserves
its geometry. The same coverage will verify that the idle state restores the
wand and `Generate` label after completion.
