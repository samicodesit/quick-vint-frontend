# Wardrobe Rewrite Widget Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dev-only responsive Vinted wardrobe mock containing a compact AutoLister listing-rewrite widget and a consistent construction-themed assistant asset.

**Architecture:** Generate one transparent WebP from the existing production character reference, then consume it from one standalone HTML/CSS preview under `design-system/`. A Playwright test opens that real preview at three viewport widths and checks placement, compactness, visibility, and horizontal overflow without adding production injection or interaction.

**Tech Stack:** Built-in Imagegen, HTML, CSS, Playwright

## Global Constraints

- Preserve the character's face, hair, original charcoal outfit, shoes, jewelry, proportions, and polished 3D style.
- Add only a construction helmet, tool belt, small paint roller, and blank listing card/clipboard; an open vest is allowed only if the original outfit remains visible.
- Copy is exactly `Let's rewrite your listings`, `Refresh your titles and descriptions without starting over.`, and `Rewrite my listings`.
- The preview is visual only and must not modify `content.js`, `manifest.json`, or production behavior.
- The widget must remain compact and create no overlap or horizontal scrolling at wide, medium, or narrow widths.
- Add no dependencies.

---

### Task 1: Consistent Construction Character Asset

**Files:**
- Reference: `../quick-vint-api/public/uninstall-winback-character.webp`
- Create: `images/wardrobe-rewrite-character.webp`

**Interfaces:**
- Consumes: the existing uninstall character as the identity and outfit anchor
- Produces: `../images/wardrobe-rewrite-character.webp` for the preview page

- [ ] **Step 1: Generate the edited character**

Use the built-in Imagegen edit flow with the existing WebP as Image 1 and this prompt:

```text
Use case: identity-preserve
Asset type: compact web widget character for AutoLister AI
Input images: Image 1 is the edit target and identity/style anchor.
Primary request: Keep exactly the same character and original charcoal overshirt, neutral top, charcoal trousers, white shoes, jewelry, face, short dark wavy hair, body proportions, and polished 3D app-store illustration style. Add a tasteful yellow construction helmet and a practical tool belt over the existing outfit. The character holds one small paint roller and one blank listing card or clipboard, suggesting that they are refreshing listings. An open work vest may be layered over the original overshirt only if the original outfit remains clearly visible.
Composition/framing: compact three-quarter-body pose, front three-quarter view, tool belt visible, readable at roughly 150px tall, generous padding, clean silhouette.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for local removal.
Constraints: change only the pose and construction accessories; preserve identity and outfit; one character; no logos; no readable text; no watermark; no extra props; no cast shadow; no reflection; do not use #00ff00 in the subject.
Avoid: costume-like redesign, bulky vest, childish mascot styling, toy proportions, anime styling, brand marks, scenery.
```

- [ ] **Step 2: Remove the chroma-key background and export WebP**

Copy the generated source into `tmp/imagegen/`, then run:

```bash
python /home/mests/.codex/skills/.system/imagegen/scripts/remove_chroma_key.py \
  --input tmp/imagegen/wardrobe-rewrite-character-source.png \
  --out tmp/imagegen/wardrobe-rewrite-character.png \
  --auto-key border \
  --soft-matte \
  --transparent-threshold 12 \
  --opaque-threshold 220 \
  --despill

ffmpeg -y -i tmp/imagegen/wardrobe-rewrite-character.png \
  -vf "scale='min(560,iw)':-2" -c:v libwebp -quality 82 \
  images/wardrobe-rewrite-character.webp
```

- [ ] **Step 3: Validate the asset visually and technically**

Inspect the source and WebP. Confirm the identity and original outfit remain recognizable, the added gear is restrained, the background is transparent, corners are transparent, and no green fringe, text, logo, or unwanted prop remains.

- [ ] **Step 4: Commit the asset**

```bash
git add images/wardrobe-rewrite-character.webp
git commit -m "Add wardrobe rewrite character"
```

### Task 2: Responsive Wardrobe Preview

**Files:**
- Create: `design-system/wardrobe-rewrite-widget.html`
- Create: `tests/e2e/wardrobe-rewrite-preview.spec.js`

**Interfaces:**
- Consumes: `../images/wardrobe-rewrite-character.webp`
- Produces: a standalone `file:`-loadable mock page with `.qv-rewrite-widget`, `[data-profile-summary]`, and `[data-profile-actions]`

- [ ] **Step 1: Write the failing browser test**

Create `tests/e2e/wardrobe-rewrite-preview.spec.js`:

```js
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { test, expect } = require("@playwright/test");

const previewUrl = pathToFileURL(
  path.join(__dirname, "../../design-system/wardrobe-rewrite-widget.html"),
).href;

test("wardrobe rewrite widget stays compact without overlapping the profile", async ({ page }) => {
  for (const viewport of [
    { name: "wide", width: 1440, height: 1000 },
    { name: "medium", width: 900, height: 900 },
    { name: "narrow", width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(previewUrl);

    await expect(page.getByRole("heading", { name: "Let's rewrite your listings" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Rewrite my listings" })).toBeVisible();

    const layout = await page.evaluate(() => {
      const rect = (selector) => {
        const { top, right, bottom, left, width, height } = document
          .querySelector(selector)
          .getBoundingClientRect();
        return { top, right, bottom, left, width, height };
      };
      const widget = rect(".qv-rewrite-widget");
      const summary = rect("[data-profile-summary]");
      const actions = rect("[data-profile-actions]");
      const body = document.querySelector(".qv-rewrite-widget__body");
      return {
        widget,
        summary,
        actions,
        bodyVisible: getComputedStyle(body).display !== "none",
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });

    expect(layout.overflow, `${viewport.name} viewport overflowed`).toBe(false);
    expect(layout.widget.height, `${viewport.name} widget became too tall`).toBeLessThanOrEqual(180);
    expect(layout.widget.bottom <= layout.actions.top || layout.widget.left >= layout.actions.right || layout.widget.right <= layout.actions.left).toBe(true);
    expect(layout.widget.bottom <= layout.summary.top || layout.widget.top >= layout.summary.bottom || layout.widget.left >= layout.summary.right || layout.widget.right <= layout.summary.left).toBe(true);
    expect(layout.bodyVisible).toBe(viewport.name !== "narrow");
  }
});
```

This test catches a widget that overlaps profile controls, grows vertically at narrow sizes, drops required copy/actions, or creates page-level horizontal overflow.

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
npx playwright test tests/e2e/wardrobe-rewrite-preview.spec.js
```

Expected: FAIL because `design-system/wardrobe-rewrite-widget.html` does not exist.

- [ ] **Step 3: Implement the smallest standalone preview**

Create one semantic HTML page with embedded CSS. Use a `.wardrobe-profile` grid whose wide layout is `160px minmax(310px, 1fr) minmax(360px, 440px) auto`; place the widget in the third column and Vinted follow/menu controls in the fourth. At `max-width: 1100px`, move the widget to a new row spanning the content columns. At `max-width: 640px`, use one column, reduce its image to about `104px`, keep the card at or below `180px`, and set `.qv-rewrite-widget__body { display: none; }`.

The widget markup is:

```html
<aside class="qv-rewrite-widget" aria-labelledby="qv-rewrite-title">
  <div class="qv-rewrite-widget__copy">
    <span class="qv-rewrite-widget__eyebrow">AutoLister AI</span>
    <h2 id="qv-rewrite-title">Let's rewrite your listings</h2>
    <p class="qv-rewrite-widget__body">Refresh your titles and descriptions without starting over.</p>
    <button type="button">Rewrite my listings</button>
  </div>
  <img src="../images/wardrobe-rewrite-character.webp" alt="" width="560" height="560" />
</aside>
```

Mock only the surrounding structure needed to judge placement: Vinted-like navigation, profile avatar/details/actions, tabs, and a small listing-card grid. Use local CSS gradients for mock listing images instead of adding more assets.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
npx playwright test tests/e2e/wardrobe-rewrite-preview.spec.js
```

Expected: PASS at all three viewport widths.

- [ ] **Step 5: Inspect screenshots and run the full relevant checks**

Capture wide, medium, and narrow screenshots to `tmp/` and inspect them. Then run:

```bash
npm run test:unit
npx playwright test tests/e2e/wardrobe-rewrite-preview.spec.js
git diff --check
```

Expected: all commands pass, the card remains compact, and the character does not cover copy or controls.

- [ ] **Step 6: Commit the preview**

```bash
git add design-system/wardrobe-rewrite-widget.html tests/e2e/wardrobe-rewrite-preview.spec.js
git commit -m "Add wardrobe rewrite widget preview"
```
