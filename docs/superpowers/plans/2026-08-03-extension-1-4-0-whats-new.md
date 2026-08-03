# AutoLister 1.4.0 What’s New Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open a distinctive local-previewed release page exactly once when an existing AutoLister installation updates to extension version 1.4.0.

**Architecture:** Add one exact-version branch to the existing Chrome `onInstalled` listener and one self-contained Astro page in the site repository. The Astro page reuses `SiteLayout`, owns its release-specific CSS and minimal reveal script, and renders explicit glass screenshot placeholders until the user supplies the three documented WebP files.

**Tech Stack:** Chrome Extension Manifest V3, Node test runner, Astro 5, Tailwind 4 utilities, scoped CSS, native `IntersectionObserver`.

## Global Constraints

- Fresh installs continue to open `https://autolister.app/welcome` only.
- Only an update whose installed manifest version is exactly `1.4.0` opens `https://autolister.app/updates/1-4-0`.
- Versions `1.4.1` and later do not open this page unless separately added in a future release.
- No new dependency, API endpoint, database state, CMS, or generic release framework.
- Use the exact palette and copy from `docs/superpowers/specs/2026-08-03-extension-1-4-0-whats-new-design.md`.
- Render missing screenshot assets as intentional labeled placeholders, never broken images.
- Respect keyboard focus, mobile layouts, WCAG AA contrast, and `prefers-reduced-motion`.
- Do not deploy the site, upload the extension, submit to Chrome Web Store, push production branches, or publish anything. Stop at a local preview URL.

## File Structure

- Modify `quick-vint/background.js`: exact 1.4.0 update-page trigger beside the existing welcome-page trigger.
- Modify `quick-vint/test/background-auth-handoff.test.js`: reuse its background VM harness to capture `onInstalled` and assert install/update behavior.
- Create `quick-vint-api/src/pages/updates/1-4-0.astro`: release page markup, copy, screenshot descriptors, scoped styles, and progressive reveal behavior.
- Future user-supplied assets, not created in this plan:
  - `quick-vint-api/public/updates/1-4-0/wardrobe-rewrite.webp`
  - `quick-vint-api/public/updates/1-4-0/phone-batch-upload.webp`
  - `quick-vint-api/public/updates/1-4-0/review-first.webp`

---

### Task 1: Gate the release page to extension update 1.4.0

**Files:**
- Modify: `background.js:51-59`
- Modify/Test: `test/background-auth-handoff.test.js`

**Interfaces:**
- Consumes: `chrome.runtime.onInstalled`, `chrome.runtime.getManifest().version`, and `chrome.tabs.create({ url })`.
- Produces: install URL `https://autolister.app/welcome` and exact update URL `https://autolister.app/updates/1-4-0`.

- [ ] **Step 1: Extend the existing test harness to expose install events**

In `runBackgroundHandoff`, capture the listener and created tabs without adding a second VM harness:

```js
const createdTabs = [];
let installedListener;

// In chrome.runtime:
getManifest: () => ({ version: options.manifestVersion || "1.0.0" }),
onInstalled: {
  addListener(listener) {
    installedListener = listener;
  },
},

// In chrome.tabs:
create(details) {
  createdTabs.push(details);
},

// In the returned harness:
createdTabs,
installedListener,
```

- [ ] **Step 2: Write the failing exact-version test**

Add one focused test with subtests so the three branches remain readable without three copied harnesses:

```js
test("background opens release pages only for their explicit install reason and version", async (t) => {
  await t.test("fresh install keeps the welcome page", async () => {
    const harness = await runBackgroundHandoff(
      { type: "PING" },
      undefined,
      { manifestVersion: "1.4.0" },
    );
    harness.installedListener({ reason: "install" });
    assert.deepEqual(harness.createdTabs, [
      { url: "https://autolister.app/welcome" },
    ]);
  });

  await t.test("update to 1.4.0 opens the dedicated page", async () => {
    const harness = await runBackgroundHandoff(
      { type: "PING" },
      undefined,
      { manifestVersion: "1.4.0" },
    );
    harness.installedListener({ reason: "update", previousVersion: "1.3.70" });
    assert.deepEqual(harness.createdTabs, [
      { url: "https://autolister.app/updates/1-4-0" },
    ]);
  });

  await t.test("another update opens no announcement page", async () => {
    const harness = await runBackgroundHandoff(
      { type: "PING" },
      undefined,
      { manifestVersion: "1.4.1" },
    );
    harness.installedListener({ reason: "update", previousVersion: "1.4.0" });
    assert.deepEqual(harness.createdTabs, []);
  });
});
```

- [ ] **Step 3: Run the test and verify the update branch fails**

Run:

```bash
node --test test/background-auth-handoff.test.js
```

Expected: fresh-install subtest passes; the 1.4.0 update subtest fails because no release tab is created.

- [ ] **Step 4: Add the minimal exact-version branch**

Keep the existing listener and uninstall URL behavior intact:

```js
chrome.runtime.onInstalled.addListener((details) => {
  setAutolisterUninstallUrl().catch(() => {});

  const extensionVersion = chrome.runtime.getManifest().version;
  if (details.reason === "install") {
    chrome.tabs.create({ url: "https://autolister.app/welcome" });
  } else if (details.reason === "update" && extensionVersion === "1.4.0") {
    chrome.tabs.create({ url: "https://autolister.app/updates/1-4-0" });
  }
});
```

- [ ] **Step 5: Run the focused test and full unit suite**

Run:

```bash
node --test test/background-auth-handoff.test.js
npm run test:unit
```

Expected: all tests pass, including the three new install/update assertions.

- [ ] **Step 6: Commit the extension trigger**

```bash
git add background.js test/background-auth-handoff.test.js
git commit -m "Open 1.4.0 update page after upgrade"
```

---

### Task 2: Build the release page with replaceable screenshot slots

**Files:**
- Create: `../quick-vint-api/src/pages/updates/1-4-0.astro`
- Reference only: `docs/superpowers/specs/2026-08-03-extension-1-4-0-whats-new-design.md`

**Interfaces:**
- Consumes: `SiteLayout` with `minimalChrome`, static files under `/updates/1-4-0/`, and browser-native `IntersectionObserver`.
- Produces: route `/updates/1-4-0`, three stable screenshot slots, and CTA URL `https://www.vinted.com/` with the instruction to open the user’s profile.

- [ ] **Step 1: Create the Astro route and screenshot descriptors**

Use a data array so placeholder and final image markup share one stable frame:

```astro
---
import { existsSync } from "node:fs";
import { join } from "node:path";
import SiteLayout from "../../layouts/SiteLayout.astro";

const screenshotDefinitions = {
  wardrobe: {
    src: "/updates/1-4-0/wardrobe-rewrite.webp",
    file: "wardrobe-rewrite.webp",
    label: "SCREENSHOT 1 — Wardrobe widget + selected listings + toolbar",
    guidance: "1600 × 1000 · Keep product UI inside the middle 80%",
    alt: "AutoLister wardrobe rewrite widget, selected listings, and toolbar",
  },
  phone: {
    src: "/updates/1-4-0/phone-batch-upload.webp",
    file: "phone-batch-upload.webp",
    label: "SCREENSHOT 2 — Phone upload + batch receiving state",
    guidance: "1600 × 1000 · Show completed phone uploads and desktop receiving",
    alt: "AutoLister phone upload and desktop batch receiving state",
  },
  review: {
    src: "/updates/1-4-0/review-first.webp",
    file: "review-first.webp",
    label: "SCREENSHOT 3 — Review title and description suggestions",
    guidance: "1600 × 1000 · Keep both suggestion actions readable",
    alt: "AutoLister title and description review suggestions on Vinted",
  },
};

const screenshots = Object.fromEntries(
  Object.entries(screenshotDefinitions).map(([key, screenshot]) => [
    key,
    {
      ...screenshot,
      available: existsSync(join(process.cwd(), "public", screenshot.src)),
    },
  ]),
);
---
```

The render branch is explicit and accessible:

```astro
{
  screenshot.available ? (
    <img src={screenshot.src} alt={screenshot.alt} loading="lazy" />
  ) : (
    <div class="shot-placeholder" role="img" aria-label={screenshot.alt}>
      <span class="shot-label">{screenshot.label}</span>
      <strong>{screenshot.file}</strong>
      <span>{screenshot.guidance}</span>
    </div>
  )
}
```

- [ ] **Step 2: Add the complete semantic story in the approved order**

Use one `<main class="release-page">` with:

```astro
<header class="release-nav" aria-label="AutoLister release">
  <a href="/" aria-label="AutoLister home">AutoLister <span>AI</span></a>
  <span class="version">VERSION 1.4.0</span>
</header>

<section class="hero">
  <p class="eyebrow">AutoLister 1.4</p>
  <h1>Your listings just got an upgrade.</h1>
  <p class="hero-copy">Rewrite your wardrobe. Upload without babysitting.</p>
  <a class="primary-cta" href="https://www.vinted.com/">Try rewriting my listings</a>
  <p class="cta-hint">Open your profile to find <strong>Rewrite listings</strong>.</p>
  <div class="light-seam" aria-hidden="true"></div>
</section>

<section class="feature feature-wardrobe reveal">
  <div class="feature-copy">
    <p class="eyebrow">Your wardrobe</p>
    <h2>Refresh your wardrobe in one go.</h2>
    <p>Select the listings you want, choose your languages, then review the new text or replace it directly.</p>
  </div>
  <!-- wardrobe screenshot frame -->
</section>

<section class="feature feature-phone reveal">
  <!-- phone screenshot frame -->
  <div class="feature-copy">
    <p class="eyebrow">Phone and batch</p>
    <h2>Add photos. Then add more.</h2>
    <p>Uploads start as soon as you choose them. Add another set whenever you need it—AutoLister keeps the full batch together and in order.</p>
  </div>
</section>

<section class="feature feature-review reveal">
  <div class="feature-copy">
    <p class="eyebrow">Review first</p>
    <h2>Keep the final say.</h2>
    <p>Use the title or description you like. Discard the one you don’t.</p>
  </div>
  <!-- review screenshot frame -->
</section>

<section class="closing reveal">
  <h2>Ready to refresh your wardrobe?</h2>
  <a class="primary-cta" href="https://www.vinted.com/">Try rewriting my listings</a>
  <p class="cta-hint">Open your profile to find <strong>Rewrite listings</strong>.</p>
</section>
```

Wrap it in:

```astro
<SiteLayout
  title="What’s new in AutoLister 1.4"
  description="Rewrite wardrobe listings and upload phone photos more smoothly with AutoLister 1.4."
  canonical="https://autolister.app/updates/1-4-0"
  ogUrl="https://autolister.app/updates/1-4-0"
  minimalChrome
>
  <Fragment slot="head"><meta name="robots" content="noindex, nofollow" /></Fragment>
  <!-- page -->
</SiteLayout>
```

- [ ] **Step 3: Implement the compact visual token system and signature seam**

Scope styles inside the page. Define exact tokens and use them rather than introducing adjacent colors:

```css
.release-page {
  --ink: #19164d;
  --indigo: #4f46e5;
  --indigo-deep: #3730a3;
  --teal: #2dd4bf;
  --lavender: #f4f3ff;
  --paper: #ffffff;
  color: var(--ink);
  background: var(--paper);
}

.product-frame {
  position: relative;
  aspect-ratio: 8 / 5;
  overflow: hidden;
  border: 1px solid rgba(79, 70, 229, 0.18);
  border-radius: clamp(1.25rem, 3vw, 2.5rem);
  background:
    radial-gradient(circle at 92% 8%, rgba(45, 212, 191, 0.18), transparent 30%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(244, 243, 255, 0.9));
  box-shadow: 0 2rem 6rem rgba(55, 48, 163, 0.14);
  backdrop-filter: blur(24px);
}

.light-seam {
  height: 2px;
  width: min(32rem, 70vw);
  background: linear-gradient(90deg, transparent, var(--indigo), var(--teal), transparent);
  box-shadow: 0 0 2.5rem rgba(79, 70, 229, 0.4);
}
```

Complete the layout with these non-negotiable outcomes:

- hero minimum height near one viewport on desktop but content remains visible on short screens;
- `h1` uses `clamp()` and stays at two or three deliberate lines, never a tiny centered marketing heading;
- feature sections have at least `clamp(6rem, 12vw, 11rem)` vertical breathing room;
- only screenshot frames use strong glass depth;
- desktop alternates composition; mobile always puts copy before its related frame;
- `.primary-cta` has visible hover, active, and `:focus-visible` states;
- placeholders use `ui-monospace`, dashed safe-area inset, filename, and screenshot guidance;
- no feature icon grid, decorative number labels, fake browser controls, or unrelated blobs.

- [ ] **Step 4: Add one progressive reveal script**

Use the browser-native observer; content starts visible when JavaScript is absent:

```astro
<script>
  const revealItems = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.add("has-reveal-motion");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.14 },
    );
    revealItems.forEach((item) => observer.observe(item));
  }
</script>
```

The CSS enhancement must be gated by `.has-reveal-motion`; reduced-motion and no-script users see the finished layout immediately.

- [ ] **Step 5: Format and build the site**

Run:

```bash
pnpm exec prettier --write src/pages/updates/1-4-0.astro
pnpm run build
```

Expected: Astro builds `/updates/1-4-0/index.html` with no missing-asset error and no TypeScript error.

- [ ] **Step 6: Commit the local-only page implementation**

```bash
git add src/pages/updates/1-4-0.astro
git commit -m "Add AutoLister 1.4 update page"
```

---

### Task 3: Review the page locally and hand off screenshot slots

**Files:**
- Verify: `../quick-vint-api/src/pages/updates/1-4-0.astro`
- Verify: `background.js`

**Interfaces:**
- Consumes: the completed extension trigger and Astro route.
- Produces: a local preview URL and desktop/mobile evidence; no external deployment.

- [ ] **Step 1: Run final scoped verification**

Run:

```bash
# In quick-vint
npm run test:unit
npm run build:prod

# In quick-vint-api
pnpm run type-check
pnpm run build
```

Expected: all commands pass. Do not run `push:production`, `git push`, Vercel, or Chrome Web Store commands.

- [ ] **Step 2: Start the local site**

Run from `quick-vint-api`:

```bash
pnpm exec astro dev --host 0.0.0.0
```

Expected local URL: `http://localhost:4321/updates/1-4-0` (use Astro’s printed port if 4321 is occupied).

- [ ] **Step 3: Inspect desktop, mobile, and reduced-motion states**

Use Playwright against the local URL at:

- desktop: `1440 × 1000`;
- mobile: `390 × 844`;
- reduced motion: `page.emulateMedia({ reducedMotion: "reduce" })`.

Confirm:

- all three intentional screenshot placeholders are fully readable;
- the hero thesis and primary CTA fit without clipping;
- every feature appears in the approved order;
- desktop alternation becomes copy-first stacking on mobile;
- keyboard focus is visible;
- reduced motion leaves all content visible;
- no normal site navigation competes with the release story.

- [ ] **Step 4: Critique once using the frontend-design brief**

Remove one unnecessary visual detail if the page feels decorated rather than product-led. Verify that the light seam is the single signature element and that screenshot frames—not generic gradient shapes—carry the visual weight.

- [ ] **Step 5: Give the user the preview and asset handoff**

Report only:

- the local preview URL;
- the three exact WebP paths and capture requirements;
- verification results;
- confirmation that nothing was deployed, pushed, uploaded, or published.
