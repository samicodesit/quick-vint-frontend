# Own-Wardrobe Rewrite Widget Design

## Goal

Ship the approved listing-rewrite widget on a seller's own Vinted wardrobe,
with a persistent expand/collapse control and no rewrite action yet. Validate
the result against the live Vinted profile layout rather than relying only on
the mock preview.

## Ownership Gate

- Match only profile paths shaped like `/member/<numeric-id>` with an optional
  username suffix.
- Read Vinted's already-rendered logged-in member ID from the page without
  making a Vinted API request. Accept either:
  - a same-origin header/profile link whose numeric member ID is explicit; or
  - the numeric `currentUser.id`/`initialUserState.user.id` serialized into the
    page by Vinted.
- Inject only when that positive logged-in member ID exactly equals the member
  ID in the current profile URL.
- Treat a visible login button or profile Follow control as a negative guard,
  never as ownership proof.
- Fail closed: if Vinted's current-user ID cannot be read or does not match, do
  not render the widget.
- Do not infer ownership from the absence of a Follow button, username text,
  avatar similarity, browser URL alone, or AutoLister account identity.

## Placement and Responsive Layout

- Anchor through stable Vinted `data-testid` attributes, starting from
  `profile-username` and the profile details/location cell. Do not depend on
  Vinted's hashed CSS-module class names.
- On wide profiles, make the details cell a two-column layout: existing badges,
  location, and verification content stay on the left; the compact widget sits
  in the unused right column.
- If location is hidden, fall back to the first details cell after the username
  header inside the same profile content block.
- Below the wide-layout breakpoint, restore the Vinted cell to normal flow and
  stack the widget after the profile details. On narrow phones, hide the
  supporting sentence before increasing height.
- The widget must not overlap profile actions, badges, description, tabs, or
  listing cards and must not cause document-level horizontal scrolling.

## Expanded and Collapsed States

- Reuse `images/wardrobe-rewrite-character.webp` and the approved copy:
  - `Let's rewrite your listings`
  - `Refresh your titles and descriptions without starting over.`
  - `Rewrite my listings`
- Keep the rewrite button visually legible but genuinely disabled in this
  release. It opens no modal, sends no request, and modifies no listing.
- Add a labeled minimize button in the expanded card.
- Collapsing replaces the card with a compact same-position pill containing a
  small character crop, `Rewrite listings`, and an expand chevron.
- The pill is the expand button, remains keyboard accessible, and never becomes
  a detached floating control.
- Persist the collapsed boolean in `chrome.storage.local` under one explicit
  key so the user's preference survives reloads and other wardrobe visits.
- Honor reduced-motion preferences; state changes need no animation to remain
  understandable.

## Lifecycle and Assets

- Keep the implementation in the existing `content.js` and stylesheet rather
  than adding a framework or a second content script.
- Start the wardrobe observer only on member-profile page loads. Stop observing
  once ownership is resolved and the widget is injected or the page is proven
  not to be the current user's profile.
- Make the character WebP available through the manifest's existing
  `web_accessible_resources` entry.
- Use prefixed IDs/classes so Vinted styles cannot accidentally target the
  widget and the widget cannot affect unrelated page content.

## Verification

- Browser tests must cover exact owner-ID match, mismatched profile ID,
  unreadable current-user state, visible login/Follow negative guards, duplicate
  prevention, initial persisted collapse, collapse persistence, expansion, wide
  badge-heavy layout, medium stacking, narrow legibility, and horizontal
  overflow.
- Load the unpacked extension in a real Chromium profile and open
  `https://www.vinted.nl/member/270830120`.
- Confirm ownership proof resolves in the authenticated browser before judging
  visual placement. If it cannot be proven, report the gate failure rather than
  weakening the check.
- Inspect wide and narrow screenshots from the live Vinted page, confirming the
  widget remains readable and does not cover real badges, actions, biography,
  tabs, or listings.
- Do not publish or wire the rewrite action in this phase.
