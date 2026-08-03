# Wardrobe Bulk Rewrite Design

## Goal

Turn the owner-only wardrobe widget into a safe bulk rewrite workflow. A seller
chooses whether generated titles and descriptions should replace the current
fields or be reviewed first, selects editable wardrobe listings, and starts a
sequential job that opens each Vinted edit page and generates new copy. The
extension never clicks Vinted's final Save or Update control.

## Reuse and Isolation

Reuse existing behavior where its contract is genuinely shared:

- `GET_BATCH_CAPACITY` remains the single source for the unified number of
  listings available now.
- `getBatchCapacity()`, authentication, quota enforcement, `/api/generate`,
  image discovery, language resolution, tab-load waiting, tab messaging, and
  generation-limit handling remain shared.
- The existing background worker remains the owner of sequential tab work, and
  batch upload and wardrobe rewrite share one active-job lock so they cannot run
  concurrently.
- `generateCurrentListing()` gains narrow options for language overrides and
  returning generated output without applying it. Its current callers retain
  their defaults and behavior.

Keep flow-specific behavior separate:

- Wardrobe selection state, item decoration, sticky controls, job messages,
  progress rendering, review suggestions, and undo state use wardrobe-prefixed
  names and never read or mutate phone/computer batch arrays, modal state,
  upload sessions, or captured-file state.
- Wardrobe jobs open known item edit URLs; batch jobs continue duplicating the
  current new-listing tab and injecting grouped photos.
- Wardrobe edit tabs use dedicated readiness and run messages. Existing
  `BATCH_PING`, `RUN_BATCH_ITEM`, and `BATCH_PROGRESS` contracts remain intact.
- Review suggestions never use the existing single description prompt because
  title and description suggestions must coexist independently.

Do not add a dependency, framework, backend queue, new permission, or new
content script.

## Capacity Badge and CTA

Wrap the existing rewrite card in a small prefixed shell so a capacity badge
can dock across its top edge without being clipped by the card's decorative
overflow. The card itself keeps its current wide and mobile dimensions.

After positive Vinted ownership resolution, fetch `GET_BATCH_CAPACITY` once.
Render these states without exposing daily, monthly, or extra-credit details:

- loading: `Checking availability...`;
- positive: `12 listings available`;
- zero or blocked: `0 listings available`; the CTA invokes the existing
  capacity-limit handling with the full server message;
- signed out: `Sign in to see availability`;
- lookup failure: `Availability unavailable` with a Retry action.

Never display a previous number after a failed refresh. Refresh capacity before
starting a job and after it finishes.

Replace the visually disabled CTA with a normal opaque button with a crisp
background, readable label, visible focus ring, and at least a 40-pixel touch
target. While capacity is loading it is disabled. If signed out, its action is
the existing AutoLister sign-in flow. With zero capacity it opens the existing
limit handling. With positive capacity it enters the preference step.

## Fixed-Size Widget Steps

The expanded widget becomes a three-state view inside the current dimensions:

1. **Intro** retains the current headline, supporting copy, character, and CTA.
2. **Preference** asks `How should generated copy be handled?` and presents two
   real radio options:
   - `Replace fields` — immediately fill title and description, with Undo;
   - `Review first` — show independent title and description suggestions before
     changing either field.
   A Continue button is disabled until a choice is selected, and Back returns
   to the intro.
3. **Selection instruction** confirms the selected mode and says to choose
   wardrobe items below. It provides an Exit selection action.

The widget must not change height between steps, overflow on narrow screens, or
animate under `prefers-reduced-motion: reduce`. Collapse is unavailable while
selection or processing is active so the current task cannot be hidden by
accident.

## Wardrobe Discovery and Selection

Use the supplied live DOM contract:

- wardrobe item: `[data-testid="grid-item"]`;
- item root: `[data-testid^="product-item-id-"]`;
- image: `[data-testid^="product-item-id-"][data-testid$="--image"]`;
- item link: `a[data-testid$="--overlay-link"][href^="/items/"]`;
- optional state: `[data-testid$="--status-text"]`.

Parse the numeric item ID from the item root and require the link ID to match.
Accept only same-origin `/items/<numeric-id>` links. Active listings and Hidden
listings are selectable; Sold listings and malformed cards are ignored because
they cannot safely enter the editable rewrite flow.

On entering selection mode:

- observe the wardrobe grid so infinite-scroll cards are decorated as they
  appear;
- add a prefixed selectable class to each eligible image container;
- add one real overlay button covering the thumbnail with an accessible label
  and a circular check indicator at the top right;
- show a purple border and one brief attention pulse when the mode begins;
- toggle selection from pointer or keyboard without following the listing link;
- enforce the current available count as the maximum selection; and
- scroll the first eligible wardrobe card into view with a modest top offset.

The pulse is omitted for reduced motion. Cleanup removes every injected class,
button, observer, and listener without altering Vinted's card or link markup.

## Sticky Wardrobe Controller

Insert one compact, prefixed toolbar immediately above the detected wardrobe
grid. It uses `position: sticky` with a safe top offset, remains in normal page
flow, and does not cover listing cards.

The toolbar contains:

- `X selected · Y available` live status;
- title-language and description-language selects populated from the existing
  `LANGUAGE_OPTIONS` and initialized by the existing language preference
  resolver;
- `Start rewrite`; and
- `Cancel`.

Language changes update the existing title and description preference keys and
the job captures the resolved codes at Start so every work tab uses one stable
pair. Start is disabled with no selection. If a capacity refresh is lower than
the selected count, remain in selection mode, explain the new maximum, and ask
the seller to deselect items rather than silently dropping explicit choices.

After a successful start, the toolbar switches to progress: current item,
completed count, total, and final success or failure. Cancel before Start exits
selection; it does not close or modify any Vinted listing.

## Background Job

Add a wardrobe job beside the existing batch job, guarded by the same
single-active-job lock. Do not turn both flows into a speculative generic job
framework; share only the existing low-level helpers.

`START_WARDROBE_REWRITE` receives:

```js
{
  items: [{ id, editUrl }],
  applyMode: "replace" | "review",
  titleLanguageCode,
  descriptionLanguageCode,
}
```

Validate every item at the message boundary:

- 1 to the refreshed available-capacity count;
- unique numeric IDs;
- HTTPS URL;
- same Vinted origin as the source tab; and
- pathname exactly `/items/<same-id>/edit`.

For each selected item, sequentially:

1. create one inactive tab at the validated edit URL;
2. wait for tab load completion;
3. poll `WARDROBE_REWRITE_PING` until the content script confirms the expected
   item edit route, at least one listing image, and both title and description
   fields;
4. send `RUN_WARDROBE_REWRITE_ITEM` with mode and language codes;
5. report `WARDROBE_REWRITE_PROGRESS` to the source profile tab; and
6. pause using the existing short inter-item settle interval before continuing.

Recheck capacity in the background before accepting the job. A batch or
wardrobe job already running rejects the new request. On an item error, stop the
remaining queue and leave opened tabs intact for inspection, matching existing
batch safety behavior. Never click Vinted Save/Update and never close a work tab
that may contain user-visible generated content.

## Edit-Tab Generation

`WARDROBE_REWRITE_PING` fails closed unless the tab is the requested item edit
route and the existing image, title, and description selectors are ready.
`RUN_WARDROBE_REWRITE_ITEM` removes cloned profile-only UI, captures the original
title and description, and calls the shared generation function with:

- existing edit-page image discovery;
- `manageButtonState: false`;
- `showMeasurementAdvice: false`;
- `throwOnLimit: true`;
- backend generation mode `batch` so current API validation and offer semantics
  remain unchanged;
- wardrobe-specific telemetry mode; and
- the job's fixed title and description language overrides.

The generation helper returns `{ title, description }` in both modes. Existing
manual and photo batch callers continue applying output exactly as they do now.

### Replace mode

Apply both generated values through the existing input-event helpers. Dock a
small rewrite-result bar by the listing detail fields with `Undo title` and
`Undo description`. Each action restores the captured original value and emits
input/change events. The controls remain available until navigation or another
generation in that tab.

### Review mode

Do not change either field during generation. Insert two independent prefixed
suggestion cards, one adjacent to the title field and one adjacent to the
description field. Each card shows the suggested text and has accessible Use
and Discard buttons.

- Use sets only that field and changes its card to a compact Undo state.
- Discard removes only that suggestion and leaves the field untouched.
- Undo restores that field's captured original value and leaves the other field
  unchanged.

The cards stay anchored in normal document flow beside their fields rather than
using global fixed positioning, preventing overlap and allowing both to exist
at once. A bounded observer reattaches the controls if Vinted rerenders the
field wrapper. It stops after both suggestions are resolved, after five minutes,
or when the page navigates.

## Failure and Cleanup Behavior

- Invalid ownership, item IDs, URLs, routes, or missing edit fields fail closed.
- Capacity and authentication failures use existing user-facing messages.
- A generation failure shows a wardrobe-specific status in its edit tab and in
  the source toolbar; it never clears existing fields.
- Review mode does not partially apply output before both generated values are
  available.
- Replace mode captures originals before the request and applies only after a
  successful complete response.
- Exiting selection removes every overlay and restores the widget intro.
- Profile navigation, page hide, or widget removal disconnects selection
  observers and listeners.
- Existing batch modal, batch progress, phone uploads, manual Generate, and
  description prompts retain their current DOM IDs, messages, and state.

## Verification

Extend the wardrobe Playwright fixture with the supplied product-grid DOM and
capacity responses. Cover:

- docked badge loading, success, zero, signed-out, failure, retry, and refresh;
- crisp enabled CTA, focus treatment, and unchanged widget dimensions;
- preference validation, Back, Continue, and selection instruction;
- active/Hidden eligibility, Sold exclusion, malformed-card rejection, dynamic
  infinite-scroll decoration, maximum selection, keyboard selection, scroll
  reveal, reduced motion, and cleanup;
- scroll offset, sticky toolbar, language initialization/persistence, Start and
  Cancel, responsive layout, and no horizontal overflow;
- fresh capacity enforcement and exact start-message payload;
- shared active-job exclusion between batch and wardrobe work;
- sequential validated edit tabs, readiness polling, progress, and stop-on-error;
- replace mode field updates and independent Undo;
- review mode untouched fields, simultaneous suggestion cards, independent
  Use/Discard, and Undo; and
- unchanged existing manual generation and photo batch behavior.

Run focused wardrobe tests after each slice, then `npm test`,
`npm run build:prod`, `git diff --check`, and a live authenticated Vinted owner
profile check at wide and narrow viewports. The live check must exercise
selection on real cards and one controlled edit tab without clicking Vinted's
Save/Update button.
