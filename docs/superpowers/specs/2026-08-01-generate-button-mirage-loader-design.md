# Generate Button Mirage Loader

## Goal

Replace conventional busy treatment on every action that starts generation
with the approved Mirage animation.

## Behavior

- Apply Mirage to the main `Generate`, phone-modal `Done + Generate`, and batch
  `Generate N listings` actions.
- Idle labels and wand icons remain unchanged.
- Active generation replaces the wand with a white Mirage animation and uses
  the label `Generating` without an ellipsis. Batch preflight uses `Starting`
  without an ellipsis before the modal enters its generating state.
- Existing non-generation labels, success state, disabled behavior, button
  dimensions, and phone-button loading state remain unchanged.
- The animation stays on the left so the label does not shift.

## Implementation

Port the motion and geometry of UI Ball's MIT-licensed LDRS Mirage loader into
the existing content-script button markup and stylesheet, with an attribution
comment. Keep it local: Chrome extension code must not import executable code
from a CDN, and this visual does not justify a new runtime dependency.

The existing `is-loading` state will reveal the Mirage element on generation
actions and hide their wand icon. The ordinary Phone upload button will retain
its current spinner. Reduced motion will render a static Mirage frame.

## Verification

Browser coverage will hold generation requests open and verify that each
generation action shows Mirage with an ellipsis-free label. The same coverage
will verify that idle states retain their existing labels and icons.
