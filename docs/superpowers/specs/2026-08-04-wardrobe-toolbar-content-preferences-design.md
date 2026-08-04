# Wardrobe Toolbar Content Preferences Design

## Goal

Expose the same visible content preferences used on the Vinted sell page while a seller selects wardrobe listings, without duplicating preference state or obscuring the wardrobe actions.

## Reused controls

The wardrobe toolbar reuses the existing control creators and storage-backed behaviour for:

- description length: Short or Long;
- description format: paragraphs or bullet points;
- hashtags;
- saved note, including the existing editor and entitlement checks; and
- emoji.

The existing shared title and description language fields remain unchanged. No new preference model, storage keys, dependency, or backend contract is introduced.

## Layout

The sticky controller has two clear rows:

1. selection count, language controls, and the Cancel / Start rewrite actions;
2. a labelled Content row containing the five reused preference controls.

The content row is separated with a subtle top border and uses the existing wardrobe glass gradient. On narrower layouts it wraps naturally beneath the main row. The actions keep their existing responsive full-width row so the primary action remains visually clear and reachable.

## Data flow and isolation

All globally stored content preferences continue to be shared between the sell page and wardrobe flow. This is intentional: changing a writing preference in either place changes the user's normal AutoLister preference.

The saved-note inclusion switch is currently local to one page. The wardrobe start request therefore snapshots only its boolean inclusion state and passes it through the existing wardrobe job messages to each edit tab. The saved note text itself remains in the existing shared storage. Wardrobe selection, item lists, progress, and apply mode remain isolated from sell and batch flow state.

## Failure behaviour

The reused controls retain their existing loading, entitlement, disabled, and fallback behaviour. If the wardrobe controller is removed, its existing preference synchronisers stop when they detect that their controls are no longer in the document.

## Validation

The first checkpoint is a local visual inspection at wide, medium, and narrow widths. Automated tests are deliberately deferred until the visual layout is approved.
