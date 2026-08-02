# Wardrobe Rewrite Widget Preview Design

## Goal

Create a dev-only visual preview of a compact AutoLister widget in the open
space beside a seller's details on a Vinted wardrobe page. The widget introduces
a future listing-rewrite flow without implementing that flow or opening its
modal yet.

## Character

- Use `quick-vint-api/public/uninstall-winback-character.webp` as the identity
  and style reference.
- Preserve the same face, short dark hair, charcoal overshirt, neutral top,
  charcoal trousers, shoes, jewelry, and polished 3D illustration style.
- Add a construction helmet and a tool belt over the existing outfit. An open
  work vest may be layered over the overshirt only if the original outfit stays
  clearly recognizable.
- Show the character actively refreshing a listing: holding a small paint roller
  and a blank listing card or clipboard. Keep the props restrained and omit
  logos, text, scenery, and extra characters.
- Export a transparent, web-optimized asset into the frontend `images/` folder
  without replacing either existing character asset.

## Widget

- Render a compact horizontal card in the otherwise empty right side of the
  mocked wardrobe profile header.
- Use AutoLister's indigo and teal accents on a white card with a subtle border
  and shadow. It should feel native beside Vinted rather than like a large ad.
- Copy:
  - Heading: `Let's rewrite your listings`
  - Supporting text: `Refresh your titles and descriptions without starting over.`
  - Button: `Rewrite my listings`
- The button is visual only in this preview. It does not open a modal, request
  data, or modify listings.
- Treat the generated character as decorative with an empty alt attribute.

## Responsive Layout

- Wide viewports: place the widget in the right-side gap of the profile header,
  using a horizontal copy/button/character composition with a bounded width.
- Medium viewports: reduce padding and character size, allow the supporting text
  to wrap, and keep the card beside the profile only while both remain readable.
- Narrow viewports: move the card below the profile summary at full available
  width, keep it horizontal and shallow, and hide the supporting sentence before
  allowing the widget to become tall or crowded.
- The widget must not overlap Vinted's follow/menu controls, profile metadata,
  tabs, or listing grid, and neither the page nor widget may scroll horizontally.

## Preview Architecture

- Add one standalone page under `design-system/` containing a lightweight mocked
  Vinted wardrobe and the real preview markup/styles.
- Keep it outside the extension manifest and production `content.js`; this review
  round is for visual approval only.
- Use only HTML and CSS. Do not add a dependency, component framework, modal,
  API mock, or JavaScript interaction.

## Verification

- Open the preview at representative wide, medium, and narrow browser widths.
- Confirm the character still reads as the existing assistant and the original
  outfit is visible beneath the added construction accessories.
- Confirm the card stays compact, avoids overlap, and creates no horizontal
  overflow at each width.
- Confirm the production extension files and manifest remain unchanged.
