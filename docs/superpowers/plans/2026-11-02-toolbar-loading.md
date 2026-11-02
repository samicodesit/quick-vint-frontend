# Shared toolbar startup

User request: speed up controls appearing in stages and show compact placeholders
for real data waits. Keep the approved Chrome 1.4.30 layout shared with Firefox.

Observed cause: the model client fetches state on its initial tick, then creates
its control only on the next three-second tick. Initial ownership/language reads
are serial. Toolbar injection also defers its first attempt to a timer.

Implementation: mount a disabled model control in its final position as soon as
the toolbar and signed-in owner exist. Use a subtle skeleton in its existing
thumbnail/toggle area with aria-busy, respecting reduced motion. Resolve it
immediately after state arrives. A toolbar-ready event handles late host DOM;
the old poll remains only as recovery. Keep account/route guards and remove the
control for a disabled feature. Do not gate unrelated actions on model loading.

Validation: regression tests with a held model response, prompt resolution after
release, stale account replies and feature-disabled/error behavior. Render both
loading and ready screens at desktop/narrow widths in the local host-contract
fixture. Run the complete deterministic frontend suite and native Firefox checks.
This is a local draft until QA completes; publication requires separate approval.
