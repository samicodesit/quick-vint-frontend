# Batch Phone Receiving State

## Goal

Once a batch upload is locked to the phone source, replace the obsolete two-source chooser with one clear, centered receiving state. Keep all existing upload, polling, finalization, stale-session, cancellation, and grouping behavior unchanged.

## Loader

Use the MIT-licensed LDRS Treadmill loader from <https://github.com/GriffinJohnston/ldrs>. Adapt its plain HTML/CSS implementation locally, following the existing LDRS attribution pattern. Do not add a package or runtime dependency.

The loader is exclusive to phone-photo transfer. The existing Mirage loader remains exclusive to AI generation.

- Bounding box: 112px wide by 24px high at every supported viewport.
- Color: the existing AutoLister purple.
- Placement: centered above the status title in a content stack no wider than 260px.
- Reduced motion: pause the animation while retaining a visible static transfer indicator.

## State Transition

Keep the current two-card chooser while neither source is selected. As soon as the phone flow is locked in, including when the expected photo count arrives before the first completed photo, replace the entire source grid with the receiving state.

The receiving state contains:

1. The Treadmill loader.
2. The existing live status title, such as `Receiving 29 photos…`.
3. The existing supporting message, such as `Keep the phone page open.`.

The modal title remains `Batch upload`, and Cancel remains in the footer. The central state should use the available body height without introducing a large bordered card or stretching the loader.

## Existing Outcomes

- While files arrive, update the count without rebuilding the upload session.
- When every expected file has arrived but server completion is pending, show `Finalizing …` and `Preparing your gallery.` with the same loader.
- If the connection becomes stale, keep the current `Check phone` and reopen-page guidance; replace or pause the active transfer treatment so it does not falsely imply healthy progress.
- When completion is confirmed, continue automatically into the existing grouping gallery.
- Closing or cancelling keeps the current confirmation and cleanup behavior.
- Computer upload keeps its current chooser and progress UI.

## Implementation Boundary

Reuse the current batch polling state and `renderBatchUploadStrip` status calculations. Add only the minimal markup/CSS switch needed when `batchInputSource === "phone"`; do not create a second upload flow or duplicate state calculations.

## Verification

Browser coverage must verify:

- The two-card chooser is present before source lock.
- Phone lock replaces both cards with one centered receiving state, including before photo one when an expected count exists.
- The loader and live count remain proportionate at desktop and narrow phone-style viewports.
- Finalizing and stale messages still render correctly.
- Completion still opens the grouping gallery.
- Reduced-motion mode leaves a visible, non-animated indicator.
