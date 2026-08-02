# Wardrobe Rewrite Widget Motion Design

## Scope

Polish the existing owner-only wardrobe rewrite widget. Add animation for its first appearance, collapse, and expansion; make the minimize control visually clear. Do not wire the rewrite CTA or add modal behavior.

## Motion

- Use the native Web Animations API with a FLIP measurement: capture the widget's first rectangle, apply the final collapsed or expanded layout, capture the last rectangle, then animate the inverse translation and scale back to the final state.
- Use a calm 420ms `cubic-bezier(.22, 1, .36, 1)` transition for collapse and expansion.
- Crossfade the outgoing and incoming widget content during the morph so the expanded copy and compact trigger never flash abruptly.
- Animate the host from its old height to its new height so profile biography and listing content move smoothly instead of jumping.
- On first resolved display, animate the final expanded or compact state for 360ms from 10px below, 0.98 scale, and zero opacity.
- Measurements must use the actual rendered rectangles after responsive layout and narrow-viewport fitting, so wide, medium, narrow, expanded, and collapsed positions use the same behavior.

## Minimize Control

- Replace the faint text minus with a proper SVG minimize icon.
- Use a 40px opaque white circular control with a violet border, dark-violet icon, and visible shadow.
- Preserve the existing accessible name and add a native tooltip. Keep the existing focus ring and minimum touch target.

## Accessibility

- When `prefers-reduced-motion: reduce` is active, apply the final state immediately with no Web Animations API motion or CSS animation.
- Keep collapse and expand controls keyboard accessible.
- Motion must not change the disabled state of the rewrite CTA.

## Testing

- Verify first appearance starts a reveal animation.
- Verify collapse and expansion produce intermediate geometry between their measured start and end rectangles, then settle on the correct state.
- Verify the host height transitions with the widget so following profile content does not jump.
- Verify reduced-motion mode applies the final state without active animation.
- Verify the minimize control contains the SVG icon and has the intended visible dimensions.
- Re-run owner gating, responsive widget tests, the full extension suite, the production build, and a live Vinted DOM visual check.
