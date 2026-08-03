# AutoLister 1.4.0 What’s New Page Design

## Goal

Open a polished release page exactly once when an existing installation updates
to extension version `1.4.0`. The page should make the release feel substantial,
show the real product clearly, and lead with the new wardrobe rewrite flow.

The audience is active Vinted sellers. The page’s single job is to help them
recognize the most useful changes and try wardrobe rewrite.

## Release behavior

- Extend the existing `chrome.runtime.onInstalled` listener in `background.js`.
- Preserve the current `/welcome` behavior for fresh installs.
- On `details.reason === "update"`, open
  `https://autolister.app/updates/1-4-0` only when the installed manifest version
  is exactly `1.4.0`.
- Do not open the page for `1.4.1`, later releases, browser restarts, extension
  reloads, or fresh installs.
- Future release pages require an explicit new version entry. There is no generic
  “open after every update” behavior.
- Chrome already emits the update event once; do not add database state or a
  second “seen” flag.

## Visual direction

Combine two established references without copying either literally:

1. AutoLister’s wardrobe UI: white glass, indigo depth, restrained teal light,
   soft lavender surfaces, precise controls, and the loader’s indigo-to-teal
   color movement.
2. Apple product-release pacing: a quiet full-screen thesis, oversized concise
   typography, generous negative space, one product idea per section, and real
   interface imagery presented as the product rather than decoration.

The page must not look like a SaaS landing-page template. Avoid feature-icon
grids, fake metrics, generic numbered sections, decorative blobs, stock photos,
and competing calls to action.

### Palette

- **Ink** `#19164D` — primary text and deep contrast
- **Indigo** `#4F46E5` — primary action and product identity
- **Deep indigo** `#3730A3` — hover and shadow depth
- **Teal light** `#2DD4BF` — restrained moving highlight
- **Lavender glass** `#F4F3FF` — product surfaces
- **Paper** `#FFFFFF` — dominant background and breathing room

### Type

- Display and body: the existing native system stack. This deliberately matches
  both the extension UI and Apple-like platform polish, avoids another webfont,
  and keeps the page fast.
- Version labels and screenshot specifications: `ui-monospace`, used sparingly
  for technical precision.
- Hero type is memorable through scale, line breaks, weight, and tight tracking,
  not through a decorative font.

### Signature element

A single indigo-to-teal **light seam** travels behind the product frames as the
page progresses. It begins as a thin animated edge in the hero, widens behind
the flagship wardrobe screenshot, then resolves into the final CTA underline.
It visually connects the release without scattering unrelated animations.

Motion is slow and controlled: one orchestrated hero entrance, section reveals,
and subtle screenshot depth on scroll. Respect `prefers-reduced-motion`; the
static composition must remain complete without animation.

## Page structure

Use `SiteLayout` with `minimalChrome`, `noindex`, and release-specific metadata.
The release page owns its layout so the normal marketing navigation does not
compete with the update story.

```text
┌──────────────────────────────────────────────────────────────┐
│ AutoLister AI                                      1.4.0     │
│                                                              │
│             Your listings just got an upgrade.               │
│       Rewrite your wardrobe. Upload without babysitting.     │
│                                                              │
│              [ Try rewriting my listings ]                   │
│                    light seam ↓                              │
├──────────────────────────────────────────────────────────────┤
│  Refresh your wardrobe in one go.                            │
│  Select listings, choose languages, review or replace.       │
│                    [ WARDROBE SCREENSHOT ]                    │
├──────────────────────────────────────────────────────────────┤
│                    [ PHONE/BATCH SCREENSHOT ]                 │
│  Add photos. Then add more.                                  │
│  Upload starts immediately and appended waves stay ordered.  │
├──────────────────────────────────────────────────────────────┤
│  Keep the final say.       [ REVIEW-FIRST SCREENSHOT ]        │
│  Use or discard each title and description suggestion.       │
├──────────────────────────────────────────────────────────────┤
│                Ready to refresh your wardrobe?                │
│              [ Try rewriting my listings ]                   │
└──────────────────────────────────────────────────────────────┘
```

### Hero

- Small AutoLister wordmark and `VERSION 1.4.0` utility label.
- Headline: **“Your listings just got an upgrade.”**
- Supporting line: **“Rewrite your wardrobe. Upload without babysitting.”**
- Primary CTA: **“Try rewriting my listings”**.
- The CTA opens Vinted and its supporting hint says **“Open your profile to find
  Rewrite listings.”** Do not invent account or profile discovery for this page.

### Flagship: wardrobe rewrite

- Headline: **“Refresh your wardrobe in one go.”**
- Copy: **“Select the listings you want, choose your languages, then review the
  new text or replace it directly.”**
- This receives the largest screenshot and strongest glass frame.

### Phone and batch uploads

- Headline: **“Add photos. Then add more.”**
- Copy: **“Uploads start as soon as you choose them. Add another set whenever
  you need it—AutoLister keeps the full batch together and in order.”**
- Mention reliability through the behavior users experience, not implementation
  language such as sessions, waves, retries, or database writes.

### Review-first controls

- Headline: **“Keep the final say.”**
- Copy: **“Use the title or description you like. Discard the one you don’t.”**
- Show title and description review blocks in one real screenshot if readable;
  otherwise use two crops inside a single composed image.

### Closing action

- Headline: **“Ready to refresh your wardrobe?”**
- Repeat the single primary CTA. Do not add pricing, newsletter, store-review,
  or secondary marketing actions.

## Screenshot placeholders

The initial preview should render intentional glass placeholders with the exact
labels below. Replacing the referenced files must not require layout or CSS
changes.

1. `public/updates/1-4-0/wardrobe-rewrite.webp`
   - Preferred source: real Vinted wardrobe showing the AutoLister widget,
     selection borders, and toolbar.
   - Capture at `1600 × 1000` or larger, landscape, about `8:5`.
   - Keep the widget and selected items inside the middle 80% safe area.
   - Placeholder label: **“SCREENSHOT 1 — Wardrobe widget + selected listings + toolbar”**.

2. `public/updates/1-4-0/phone-batch-upload.webp`
   - Preferred source: desktop batch modal in the clear central receiving state,
     ideally paired with the phone page showing completed uploads.
   - Capture or compose at `1600 × 1000`, landscape, about `8:5`.
   - Placeholder label: **“SCREENSHOT 2 — Phone upload + batch receiving state”**.

3. `public/updates/1-4-0/review-first.webp`
   - Preferred source: a real Vinted edit page showing both the suggested-title
     and suggested-description review blocks with their actions.
   - Capture at `1600 × 1000`, landscape, about `8:5`.
   - Placeholder label: **“SCREENSHOT 3 — Review title and description suggestions”**.

Each placeholder shows its filename, required contents, target aspect ratio, and
safe-area note directly on the page. Missing images are expected during review,
not treated as broken assets.

## Responsive behavior

- Desktop uses large centered frames and alternating text/image composition.
- Tablet reduces frame depth and type scale without changing the story order.
- Mobile stacks every section in reading order, keeps CTAs full-width where
  appropriate, and avoids sticky effects that consume viewport height.
- Screenshot frames preserve their aspect ratio and may crop only decorative
  browser chrome, never product controls or placeholder instructions.
- Keyboard focus is visible; color contrast meets WCAG AA.

## Implementation boundaries

- One new Astro route and the smallest exact-version branch in the existing
  extension install listener.
- Reuse `SiteLayout`, current brand tokens, and native browser APIs.
- No new package, animation library, CMS, database table, API endpoint, or
  generic release-management framework.
- Keep the existing `/updates/latest` page untouched unless its removal is
  separately requested; it may still have external links.
- Do not deploy the site, upload the extension, submit to Chrome Web Store, or
  publish anything during implementation. Provide a local preview URL first.

## Verification

- Add one focused background test proving:
  - install opens `/welcome` only;
  - update to `1.4.0` opens `/updates/1-4-0`;
  - update to another version opens no release page.
- Run the relevant frontend unit test and backend/site build.
- Inspect desktop and mobile screenshots locally, including reduced-motion and
  missing-placeholder states.
- Hand the user a local URL for visual review. Deployment and store publication
  require a separate explicit approval.
