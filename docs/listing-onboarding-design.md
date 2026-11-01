# Listing tools and first-use guidance

Local implementation of approved direction C. No deployment or paid generation.

Keep the existing upload, generation, preferences and account-model handlers.
Place Add photos beside the native Photos heading. Keep Generate, model,
Writing style and More in one desktop row. Move existing preferences into a
Writing style dialog, with languages remaining beside their respective fields.
Use existing Geist and the same Lucide icons as the web app.

## First use

Prefer a contextual, optional tour over an autoplay video or blocking wizard.
A compact invitation offers Quick tour and Skip once on an authenticated
new-listing page. No automatic tour on existing listings or batch worker tabs.
Starting it shows three short anchored tips: add photos, generate and review,
optional model. If the model is unavailable, omit that tip. Mention languages
and Writing style in the generation tip. Never perform actions on the user's
behalf. No forced uploads, generation, paid calls or sample listing changes.

Skip, close, Escape or completion permanently dismiss the automatic invitation
for that account in this browser. More allows replay on create and edit pages.
The tour does not steal focus until explicitly started. It has a visible step
counter, Back, Next, Done and Skip. On narrow screens use a compact bottom card.
Respect reduced motion. Pause/dismiss when host navigation, account changes,
generation, upload or a conflicting dialog makes the context invalid.

Replace the automatic model invitation on listing pages with the model tour
step and existing New badge. Keep the model setup view available on demand.
No repeated popups following tour dismissal. No extra New badge.

## Verification

Exercise real extension handlers in deterministic browser fixtures: upload
chooser, writing preference persistence, tour dismissal/replay/account isolation,
edit pages, keyboard operation, missing model and competing dialogs.
Inspect actual rendered desktop and narrow-screen states. Run the full local
unit and browser suites with the matching API checkout. No listing publication.

## Verification recorded on 2026-11-01

- Full extension browser suite: 360 passed, 13 skipped.
- Unit suite after localization coverage: 168 passed.
- Final targeted tour suite: five passed, including model preview/toggle,
  hidden host overlays, dismissal/replay, account changes and keyboard focus.
- Upload chooser and manual generation regression checks also passed.
- Extension production build passed. Welcome site type check and build passed;
  nine existing welcome localization/checkout tests passed.
- Canonical persistent runner exercised the local build on real Vinted at
  1440, 1024 and 375 CSS pixels. No toolbar overflow. Native upload controls
  remain untouched. The model entry used a cached example because the feature
  remains gated on the production API. No paid generation or listing writes.
- Narrow-screen Chromium checks are not actual Orion/iOS compatibility proof.
- No deployment. The previously recorded garment-validator release blocker
  remains outside this onboarding change.

Real-host inspection found and corrected a hidden drop-overlay anchor error.
The photo action now sits outside the native dropzone, anchored to visible
heading text, with a safe fallback when the heading cannot be identified.
The settings panel uses the existing handlers, focus containment and dismissal.
