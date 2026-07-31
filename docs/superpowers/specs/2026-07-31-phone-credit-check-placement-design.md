# Phone Credit Check Placement

## Goal

Check listing capacity on the first **Phone** button click, before showing the
`1 item` / `Multiple items` chooser.

## Flow

`openUploadChoiceModal()` shows the existing `Checking...` state and calls the
existing capacity endpoint. If no capacity remains, it shows the existing
limit UI and does not open the chooser. If capacity is available, it opens the
chooser and passes that result to the selected single- or batch-upload path.

The option handlers do not repeat the capacity request. All later server-side
generation enforcement remains unchanged.

## Verification

Browser coverage will prove that a blocked first click never opens the chooser
and that an allowed first click opens it with only one capacity request after
either option is selected.
