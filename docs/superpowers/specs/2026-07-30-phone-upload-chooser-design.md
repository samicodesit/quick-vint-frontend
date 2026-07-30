# Phone Upload Chooser Design

## Goal

Replace the separate Phone and Batch buttons with one Phone button that opens a simple chooser.

## Button

- Keep one primary upload button near Generate.
- Label: `Phone`
- Icon: existing phone icon.

## Chooser Modal

The modal uses short, localized UI copy.

Default copy:

- Title: `Upload from phone`
- Option 1: `1 item`
- Option 1 note: `Add photos to this listing`
- Option 2: `Multiple items`
- Option 2 note: `Create new listings`

When the current page already has photos or is an edit page, the multiple-items note becomes:

- `Create new listings. This listing will not change.`

The layout must be clean and uncluttered:

- no dense explanatory paragraphs
- no long warnings
- no nested cards
- no heavy borders
- large tap targets
- clear close action

## Behavior

- Clicking `Phone` opens the chooser.
- Clicking `1 item` closes the chooser and continues the current single phone-upload flow.
- Clicking `Multiple items` closes the chooser and continues the current batch flow.
- Batch is no longer blocked just because the current listing already has photos.
- Existing capacity, authentication, QR upload, polling, generation, and batch grouping behavior remains unchanged after the choice.

## Localization

The chooser copy is localized for every supported UI language in `content.js`.

Use the extension UI language profile, not the selected title or description output language. Fall back to English.

## Tests

Add focused E2E coverage that proves:

- only one Phone button is shown for upload choices
- clicking Phone opens the localized chooser
- `1 item` opens the existing single phone modal
- `Multiple items` opens the existing batch modal
- batch can be started from a listing that already has photos and shows the clear "this listing will not change" copy
