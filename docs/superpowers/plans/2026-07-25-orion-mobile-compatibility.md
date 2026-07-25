# Orion Mobile Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every AutoLister extension surface usable on Orion/iPhone without changing the desktop experience, and publish an SEO-rich Orion usage guide.

**Architecture:** Keep the current desktop UI and behavior as the baseline. Add viewport-scoped CSS overrides to the existing extension surfaces, preserve the Orion auth-tab behavior, and build one Astro guide page using the site's existing layout and utilities.

**Tech Stack:** Manifest V3 JavaScript, CSS, Playwright, Astro 5, Tailwind CSS 4, Vitest.

## Global Constraints

- Desktop geometry and behavior at 1280px and wider must remain unchanged.
- Mobile support must cover 320px through 430px widths.
- Orion behavior detection uses `window.KAGI` only where browser behavior differs.
- Mobile touch targets are at least 44px.
- No new runtime dependency or duplicated mobile implementation.
- The guide is English-first at `/vinted-extension-iphone-orion`.
- The guide must accurately describe Orion iOS extension support as preliminary.

---

### Task 1: Lock Mobile and Desktop Extension Geometry

**Files:**
- Modify: `tests/e2e/extension.spec.js`

**Interfaces:**
- Consumes: existing `openContentHarness(page, capacityResponse, options)` and loaded extension fixtures.
- Produces: geometry regressions for desktop tools and Orion-width tools/dialogs.

- [ ] **Step 1: Add the mobile action-layout regression**

Add a Playwright test that sets a 390×844 viewport, opens an authenticated listing, and asserts:

```js
const primaryBox = await page.locator(".quickvint-primary-tools").boundingBox();
const actionBoxes = await Promise.all(
  ["#quickvint-gen-btn", "#quickvint-phone-btn", "#quickvint-batch-btn", "#quickvint-report-btn"]
    .map((selector) => page.locator(selector).boundingBox()),
);

expect(actionBoxes.every((box) => box && box.height >= 44)).toBe(true);
expect(Math.max(...actionBoxes.map((box) => box.x + box.width))).toBeLessThanOrEqual(
  primaryBox.x + primaryBox.width + 1,
);
expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
  true,
);
```

- [ ] **Step 2: Run the mobile action test and verify RED**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "fits listing tools on an Orion phone viewport"
```

Expected: FAIL because current controls are 38px tall and the feedback action wraps outside the primary row.

- [ ] **Step 3: Add mobile dialog regressions**

Add tests for report, saved-note, Phone, and Batch dialogs at 390×844. For each rendered dialog, assert its card/content stays within the viewport, its action buttons are at least 44px tall, and the page has no horizontal overflow.

- [ ] **Step 4: Run dialog tests and verify RED**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "fits .* on an Orion phone viewport"
```

Expected: FAIL on the current 38px report/saved-note actions and 36px batch actions.

- [ ] **Step 5: Add the desktop characterization regression**

At 1280×900, assert the existing primary group remains `display: flex`, the Generate button remains 38px tall, all four primary actions share one row, and the report dialog remains vertically centered.

- [ ] **Step 6: Run the desktop characterization test**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "preserves desktop listing tool geometry"
```

Expected: PASS against the untouched desktop implementation.

- [ ] **Step 7: Commit the tests**

```bash
git add tests/e2e/extension.spec.js
git commit -m "test: cover Orion mobile extension layout"
```

### Task 2: Add the Narrow-Screen Extension Layout

**Files:**
- Modify: `content.js`

**Interfaces:**
- Consumes: existing IDs and classes emitted by `injectButton()` and each modal builder.
- Produces: one `@media (max-width: 680px)` compatibility layer with no base-selector changes.

- [ ] **Step 1: Add the minimum responsive override**

Append one mobile media block to `injectStylesheet()` that:

```css
@media (max-width: 680px) {
  .quickvint-tools { width: 100%; align-items: stretch; }
  .quickvint-primary-tools {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr)) 44px;
    width: 100%;
    gap: 6px;
  }
  #quickvint-gen-btn,
  #quickvint-phone-btn,
  #quickvint-batch-btn {
    width: 100%;
    min-width: 0;
    min-height: 44px;
    padding: 10px 6px;
  }
  #quickvint-report-btn { width: 44px; height: 44px; min-width: 44px; }
  .quickvint-tool-options {
    justify-content: flex-start;
  }
}
```

Add these scoped rules in the same media block:

```css
.quickvint-tool-options {
  justify-content: flex-start;
  gap: 6px;
}
#quickvint-description-length-toggle,
#quickvint-output-shape-toggle,
.quickvint-binary-toggle,
.quickvint-note-control {
  min-height: 44px;
}
.quickvint-lang-menu {
  max-width: calc(100vw - 24px);
}
#quickvint-report-modal,
#quickvint-description-footer-modal,
#quickvint-phone-modal {
  align-items: flex-end;
  padding: 0;
  padding-top: max(12px, env(safe-area-inset-top));
}
#quickvint-report-modal .quickvint-report-card,
#quickvint-description-footer-modal .quickvint-footer-card,
#quickvint-phone-modal .modal-content {
  width: 100%;
  max-width: none;
  max-height: calc(100dvh - max(12px, env(safe-area-inset-top)));
  margin: 0;
  padding-bottom: max(18px, env(safe-area-inset-bottom));
  border-radius: 18px 18px 0 0;
  overflow-y: auto;
}
#quickvint-report-modal .quickvint-report-secondary,
#quickvint-report-modal .quickvint-report-submit,
#quickvint-description-footer-modal .quickvint-footer-secondary,
#quickvint-description-footer-modal .quickvint-footer-clear,
#quickvint-description-footer-modal .quickvint-footer-save,
#quickvint-phone-modal .close-btn,
#quickvint-phone-modal .generate-btn,
#quickvint-batch-modal button {
  min-height: 44px;
}
```

Keep the existing Batch organizer's grid and sticky action rules, adding only safe-area bottom padding and 44px action heights.

- [ ] **Step 2: Run focused mobile tests and verify GREEN**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "Orion phone viewport"
```

Expected: all focused mobile geometry tests PASS.

- [ ] **Step 3: Run the desktop characterization test**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "preserves desktop listing tool geometry"
```

Expected: PASS with 38px desktop controls and centered desktop dialogs.

- [ ] **Step 4: Run all extension tests**

Run:

```bash
npm test
```

Expected: unit and all Playwright tests PASS.

- [ ] **Step 5: Commit the responsive layer**

```bash
git add content.js
git commit -m "fix: make extension tools responsive in Orion"
```

### Task 3: Harden Orion Authentication Surfaces

**Files:**
- Modify: `popup.html`
- Modify: `callback.html`
- Test: `tests/e2e/extension.spec.js`

**Interfaces:**
- Consumes: existing `auth-tab-mode` body class and callback state containers.
- Produces: dynamic-viewport and safe-area handling without changing normal desktop popup dimensions.

- [ ] **Step 1: Extend the existing auth-tab mobile regression**

Assert the 390×844 sign-in tab has no horizontal overflow, its container fits within the viewport, and the primary sign-in control is at least 44px tall.

- [ ] **Step 2: Run the auth-tab test**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "responsive sign-in page"
```

Expected: existing behavior remains green; the test characterizes the rendered contract before static safe-area enhancement.

- [ ] **Step 3: Apply safe-area and dynamic viewport CSS**

Use native CSS only:

```css
body.auth-tab-mode {
  min-height: 100dvh;
}

@media (max-width: 520px) {
  body.auth-tab-mode {
    padding:
      max(18px, env(safe-area-inset-top))
      max(12px, env(safe-area-inset-right))
      max(18px, env(safe-area-inset-bottom))
      max(12px, env(safe-area-inset-left));
  }
}
```

In `callback.html`, set `box-sizing: border-box` on all elements, change the body to `min-height: 100dvh`, and update the existing mobile media block so body padding uses all four `env(safe-area-inset-*)` values and `.auth-container` has `max-height: calc(100dvh - 24px)` plus `overflow-y: auto`.

- [ ] **Step 4: Run auth, unit, and build checks**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "sign-in|auth"
npm run test:unit
npm run build:prod
```

Expected: all commands PASS.

- [ ] **Step 5: Commit auth-surface changes**

```bash
git add popup.html callback.html tests/e2e/extension.spec.js
git commit -m "fix: fit Orion authentication to iPhone viewports"
```

### Task 4: Publish the Orion iPhone Guide

**Files:**
- Create in `quick-vint-api`: `src/pages/vinted-extension-iphone-orion.astro`

**Interfaces:**
- Consumes: `SiteLayout`, `CHROME_WEB_STORE_URL`, existing Tailwind theme, existing analytics event names.
- Produces: `/vinted-extension-iphone-orion/` static route with Article, HowTo, FAQPage, and BreadcrumbList structured data.

- [ ] **Step 1: Create the guide page**

Build a single Astro page with:

```astro
---
import SiteLayout from "../layouts/SiteLayout.astro";
import { CHROME_WEB_STORE_URL } from "../utils/blog.js";

const canonical = "https://autolister.app/vinted-extension-iphone-orion";
const faqItems = [
  {
    question: "Can you use a Vinted Chrome extension on iPhone?",
    answer:
      "Yes. Orion for iOS has preliminary support for Chrome WebExtensions, which lets you install AutoLister AI and use it on Vinted listing pages.",
  },
  {
    question: "Why does AutoLister open a full sign-in tab in Orion?",
    answer:
      "Orion on iPhone does not handle every browser-action popup like desktop Chrome. AutoLister opens a full extension tab so sign-in can complete reliably.",
  },
];
const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "How to Use a Vinted Extension on iPhone with Orion",
    url: canonical,
  },
  {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to install and use AutoLister AI on iPhone with Orion",
    step: [
      { "@type": "HowToStep", name: "Install Orion Browser" },
      { "@type": "HowToStep", name: "Enable Chrome extensions" },
      { "@type": "HowToStep", name: "Install AutoLister AI" },
      { "@type": "HowToStep", name: "Open a new Vinted listing and sign in" },
      { "@type": "HowToStep", name: "Generate and review the listing draft" },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://autolister.app/" },
      { "@type": "ListItem", position: 2, name: "Vinted Extension for iPhone", item: canonical },
    ],
  },
];
---

<SiteLayout
  canonical={canonical}
  title="Vinted Extension for iPhone: Use AutoLister with Orion"
  description="Install a Vinted Chrome extension on iPhone with Orion. Learn how to set up AutoLister AI, sign in, generate Vinted descriptions, and troubleshoot updates."
  ogUrl={canonical}
  ogImage="https://autolister.app/banner.png"
>
  {structuredData.map((item) => (
    <script type="application/ld+json" set:html={JSON.stringify(item)} />
  ))}
</SiteLayout>
```

Inside `SiteLayout`, render in order: a search-focused hero; a visible preliminary-support notice; five numbered setup steps; separate single-listing, Phone upload, and Batch upload instructions; an update/version section; troubleshooting; the `faqItems` accordion rendered as semantic headings and paragraphs; internal links to `/`, `/pricing`, `/support`, `/vinted-description-generator`, and `/blog/batch-generate-vinted-listings`; and a final Chrome Web Store CTA plus independence disclaimer.

Link installation and limitations to `https://help.kagi.com/orion/browser-extensions/ios-ipados-extensions.html`. Link update instructions to `https://help.kagi.com/orion/features/automatic-extension-updates.html`. Use `CHROME_WEB_STORE_URL` for every install CTA.

- [ ] **Step 2: Format and build**

Run:

```bash
npx prettier --write src/pages/vinted-extension-iphone-orion.astro
npm run build
```

Expected: Astro emits `dist/vinted-extension-iphone-orion/index.html`.

- [ ] **Step 3: Verify rendered SEO and semantics**

Run a local preview and inspect the built DOM at 390×844 and 1440×1000. Assert:

- one H1;
- canonical URL;
- title and description;
- all four JSON-LD types;
- no horizontal overflow;
- no browser console errors;
- visible installation, update, troubleshooting, disclaimer, and CTA sections.

- [ ] **Step 4: Commit the guide**

```bash
git add src/pages/vinted-extension-iphone-orion.astro
git commit -m "feat: add Orion iPhone extension guide"
```

### Task 5: Full Verification and Production Integration

**Files:**
- Verify all changed files in both repositories.

**Interfaces:**
- Consumes: completed extension branch and site branch.
- Produces: verified commits merged and pushed to each production `main`.

- [ ] **Step 1: Run extension production verification**

```bash
npm run verify:production
```

Expected: all unit tests, Playwright tests, and production build PASS.

- [ ] **Step 2: Run site production verification**

```bash
npm run verify:production
```

Expected: lint, type-check, build, formatting, and all Vitest tests PASS.

- [ ] **Step 3: Review diffs and release status**

```bash
git diff main...HEAD --check
git diff --stat main...HEAD
npm run release:status
```

Do not bump or package unless release status and the Chrome Web Store workflow require it.

- [ ] **Step 4: Merge into each local main**

Merge each isolated branch into its corresponding `main` checkout without rewriting history.

- [ ] **Step 5: Push through production gates**

In each main checkout:

```bash
npm run push:production
```

Expected push output includes `main -> main`.

- [ ] **Step 6: Confirm production state**

Verify both local `main` branches match `origin/main`, the guide returns HTTP 200 after deployment, and extension release status is reported accurately.
