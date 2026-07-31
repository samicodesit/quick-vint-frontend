# Batch Available Listings

## Goal

Show users how many listings they can generate before and during batch setup,
without exposing or requiring them to understand daily limits, monthly limits,
or extra-credit accounting.

## Decision

Show the same unified availability number in both places, with different
visual weight:

- The Single/Multiple chooser shows a quiet line beneath its title:
  `12 listings available now`.
- The batch modal keeps a compact `12 available` pill beside its title through
  upload and organization.
- Once groups exist, the organization screen adds contextual copy such as
  `Using 3 of 12 available`.

Chooser-only placement would disappear when the number becomes actionable.
Batch-only placement would make users commit to the flow before learning their
capacity. The asymmetric two-screen treatment provides both early reassurance
and useful grouping guidance without presenting two different concepts.

## Data and Refresh Behavior

Use the existing `capacity.available` value returned by
`GET_BATCH_CAPACITY`. The API already combines the currently usable plan
allowance and extra credits into one actionable total while respecting the
active daily and monthly constraints.

The chooser uses the capacity result already fetched on the first Phone button
click. Selecting Multiple items passes that same result into the batch modal,
so opening the modal causes no additional request. When the organization phase
performs its existing capacity refresh, the pill and contextual copy update to
the refreshed total.

The UI must not display the underlying daily, monthly, free-lifetime, or pack
credit values. It must not call the total a credit balance; use `available now`
because the number can change when a time-based allowance resets.

## States

- Positive capacity: show the unified number.
- Refreshing in the organization phase: show `Checking availability...` in the
  existing capacity status area; do not invent a temporary number.
- Capacity lower than grouped items: retain the existing warning and
  `Generate first X of Y` action.
- Zero or blocked capacity: retain the existing paywall/error handling before
  the chooser and the existing batch safety check before generation.
- Capacity lookup failure: retain the current failure copy and disable batch
  generation; do not present stale capacity as current.

## Accessibility and Layout

Availability text remains visible text rather than color-only information. The
chooser line is associated with the dialog content, and the batch value lives
in the persistent modal heading. Updates in the organization phase use the
existing polite live status behavior. Desktop and mobile button geometry and
modal close controls remain unchanged.

## Verification

Playwright coverage will verify that:

- the chooser displays the fetched unified number;
- selecting Multiple items reuses that result without another capacity call;
- the batch header displays the same number during upload and organization;
- grouping items shows `Using X of Y available`;
- a refreshed lower capacity updates the copy and limited-generation action;
- no daily, monthly, or extra-credit breakdown appears in either screen.
