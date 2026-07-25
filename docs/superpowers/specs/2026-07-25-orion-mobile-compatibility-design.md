# Orion Mobile Compatibility and Guide Design

**Date:** 2026-07-25

## Goal

Make AutoLister AI usable and visually coherent in Orion on iPhone while preserving every existing desktop extension flow and desktop layout. Publish an English SEO guide that explains how to install and use AutoLister AI through Orion.

## Scope

### Extension

The pass covers every user-facing extension surface on a Vinted listing page:

- signed-out sign-in handoff;
- Generate, Phone, Batch, and feedback actions;
- language selectors;
- description length, output format, hashtags, saved note, and emoji controls;
- single phone-upload modal;
- batch upload waiting, grouping, generation, success, and failure states;
- report and saved-note dialogs;
- limit, checkout, offer, and informational cards;
- extension sign-in tab and authentication callback.

The hosted phone-upload page is already mobile-first, but its smallest supported viewport and safe-area behavior remain part of the regression gate.

### Website

Create `/vinted-extension-iphone-orion` as a standalone English guide and search landing page. It must use the existing Astro `SiteLayout`, global design system, analytics attributes, and Chrome Web Store URL.

## Constraints

1. Desktop is the baseline. Existing desktop selectors and dimensions remain unchanged outside narrow-screen media queries.
2. No new runtime dependency, component framework, mobile application, or duplicated mobile implementation.
3. Orion-specific behavior uses the browser's documented `window.KAGI` signal only where behavior differs, not for general styling.
4. Responsive styling is viewport-driven so iPhone, iPad split view, and narrow desktop windows degrade safely.
5. Mobile actions must remain reachable with the on-screen keyboard open.
6. Touch controls must have a minimum 44px target where the mobile override applies.
7. Modals must not create horizontal page overflow at 320px, 390px, or 430px widths.
8. The guide must not claim that every Chrome extension works in Orion. Orion's own documentation calls iOS WebExtension support preliminary and subject to Apple API limitations.
9. AutoLister remains an independent tool and is not affiliated with Vinted, Orion, Kagi, or Apple.

## Chosen Approach

Keep the desktop implementation as the source of truth and add one narrow-screen compatibility layer to the existing injected stylesheet. The layer changes layout only below 680px:

- primary actions become a three-column action grid plus a fixed feedback target;
- preference controls wrap from the left with 44px minimum height;
- floating menus are clamped to the viewport;
- dialogs become safe-area-aware bottom sheets with bounded internal scrolling;
- phone and batch upload actions remain visible through sticky action areas;
- transient cards use full available width with safe horizontal margins.

The popup's normal 320px toolbar presentation is unchanged. Only `auth-tab-mode` receives iPhone safe-area and viewport-height adjustments because that is the Orion sign-in path.

The hosted authentication callback receives the same safe-area and `100dvh` treatment without changing desktop card styling.

## Desktop Preservation Strategy

Desktop preservation is tested as behavior, not inferred from the presence of media queries:

- At 1280×900, the primary tools stay in one flex row and retain their current 38px control height.
- At 1280×900, report, saved-note, phone, and batch dialogs retain centered-card geometry.
- Existing 68 Playwright flows and unit tests remain green.
- Production builds remain byte-valid and use the production API origin.

No base desktop declaration will be rewritten to make the mobile layer work.

## Mobile Acceptance Criteria

At an Orion-like 390×844 viewport with touch enabled:

1. Generate, Phone, Batch, and feedback controls are all visible without horizontal scrolling.
2. Primary controls have at least 44px height and no label clipping.
3. Preference controls wrap inside the Vinted form without page-level horizontal overflow.
4. The sign-in button opens the full extension tab, not a browser-action popup.
5. Report and saved-note dialogs fit the viewport, scroll internally, and keep their final actions reachable.
6. Single phone-upload content fits the viewport and its Close/Generate actions remain reachable.
7. Batch waiting, grouping, and generation states fit the viewport; sticky action controls remain reachable.
8. Paywalls, offers, and toasts fit between 12px viewport margins.
9. Language menus stay within the left and right viewport edges.
10. The auth tab and callback page respect iPhone safe areas and dynamic viewport height.
11. The hosted phone-upload page has no horizontal overflow at 320px.

## Guide Information Architecture

The guide route is `/vinted-extension-iphone-orion`.

### Search intent

Primary phrases:

- Vinted extension for iPhone;
- Chrome extensions on iPhone;
- Orion browser Chrome extensions;
- Vinted description generator for iPhone;
- AI Vinted listing generator iOS;
- use AutoLister on iPhone.

Secondary phrases appear naturally in headings, body copy, metadata, and FAQ answers. Keyword repetition must never reduce readability.

### Page sections

1. Hero answering whether a Vinted Chrome extension can run on iPhone.
2. Compatibility and limitations notice.
3. Install Orion and enable Chrome extensions.
4. Install AutoLister AI from the Chrome Web Store.
5. Sign in from the Vinted listing page.
6. Create one listing from photos already on the listing.
7. Use Phone upload and Batch upload.
8. Keep the extension updated and verify its version.
9. Troubleshooting.
10. Frequently asked questions.
11. Final Chrome Web Store call to action and independence disclaimer.

### Structured metadata

- canonical URL;
- search-focused title and meta description;
- Open Graph and Twitter metadata through `SiteLayout`;
- `Article`;
- `HowTo`;
- `FAQPage`;
- breadcrumb structured data;
- contextual internal links to the homepage, pricing, support, Vinted description generator, and batch guide.

## Source Accuracy

The guide links to first-party Orion documentation for:

- enabling third-party Chrome extensions on iOS;
- managing installed extensions;
- the preliminary status of iOS/iPadOS extension support;
- Orion's `window.KAGI` browser context signal;
- automatic extension updates where available.

Product instructions and supported AutoLister features come from the current extension implementation and Chrome Web Store listing.

## Testing

### Extension

Add focused Playwright tests before production styling:

- desktop geometry regression;
- Orion mobile action-grid and overflow regression;
- mobile report dialog;
- mobile saved-note dialog;
- mobile single-upload dialog;
- mobile batch dialog;
- mobile auth-tab safe-area behavior.

Each test asserts rendered geometry and reachability. It does not inspect source text.

### Website

Add a Vitest page-source contract test before creating the page. It verifies the route's public metadata, structured-data types, key installation steps, first-party citations, internal links, and independence disclaimer.

Then run:

- extension `npm test`;
- extension `npm run build:prod`;
- site `npm run verify:production`;
- browser screenshots at 390×844 and 1440×1000 for the guide;
- horizontal-overflow and console-error checks for both guide viewports.

## Release

After all tests and visual checks pass:

1. Commit extension and site changes on their isolated branches.
2. Merge each branch into its local `main`.
3. Run the full production gate on the merged result.
4. Push with each repository's `npm run push:production`.
5. Confirm `main -> main` for both repositories.

The extension source version is not bumped or repackaged unless the production release status requires a new Chrome Web Store package after implementation.
