# Own-Wardrobe Rewrite Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inject the approved compact rewrite widget only on the logged-in seller's own Vinted wardrobe, with persistent expand/collapse and no rewrite action.

**Architecture:** Extend the existing all-Vinted-pages content script with a narrowly scoped member-page observer. Ownership is a fail-closed exact numeric ID comparison between the profile URL and Vinted's rendered current-user state; the widget then joins the stable profile details cell as a second grid column on wide pages and stacks in normal flow at smaller widths.

**Tech Stack:** Manifest V3 content script, DOM/CSS, `chrome.storage.local`, Playwright

## Global Constraints

- Show only after a positive exact match between the member URL ID and Vinted's rendered logged-in member ID.
- Absence of Follow is not ownership proof; visible Login or Follow controls block injection.
- Make no Vinted API request and do not connect AutoLister identity to Vinted identity.
- Use stable Vinted `data-testid` anchors and do not depend on hashed CSS-module class names.
- Persist only one collapsed boolean in `chrome.storage.local`.
- Keep `Rewrite my listings` disabled and wire no modal, rewrite, API, or listing action.
- Add no dependency or new content script.
- Preserve legibility and avoid overlap/horizontal overflow with badges, biography, actions, tabs, and listings.

---

### Task 1: Fail-Closed Ownership Gate and Live Profile Injection

**Files:**
- Modify: `content.js`
- Modify: `manifest.json`
- Modify: `tests/e2e/extension.spec.js`

**Interfaces:**
- Produces: `getVintedMemberId(pathname) -> string | null`
- Produces: `getRenderedVintedCurrentUserId() -> string | null`
- Produces: `isOwnVintedWardrobe() -> boolean`
- Produces: `injectWardrobeRewriteWidget() -> Promise<boolean>`
- Consumes: `images/wardrobe-rewrite-character.webp` through `chrome.runtime.getURL()`

- [ ] **Step 1: Add a failing own-wardrobe browser fixture and tests**

Add a helper beside the existing content harness that fulfills a local request to
`https://www.vinted.nl/member/<id>`, renders real stable Vinted anchors, installs
the existing Chrome harness, and loads `language-defaults.js` plus `content.js`.
Its inline state script uses the same escaped shape seen in Vinted's Next flight
payload:

```html
<script type="application/json" data-vinted-state>
  initialUserState\":{"user\":{"id":270830120}}
</script>
```

Add tests proving observable behavior:

```js
test("shows the rewrite widget only when Vinted's current member ID matches the profile", async ({ page }) => {
  await openWardrobeHarness(page, { profileId: "270830120", currentUserId: "270830120" });
  await expect(page.locator("#quickvint-wardrobe-rewrite-widget")).toBeVisible();
  await expect(page.getByRole("button", { name: "Rewrite my listings" })).toBeDisabled();
});

for (const scenario of [
  { name: "another member", profileId: "270830120", currentUserId: "123" },
  { name: "unreadable user state", profileId: "270830120", currentUserId: null },
  { name: "signed out", profileId: "270830120", currentUserId: "270830120", login: true },
  { name: "followable profile", profileId: "270830120", currentUserId: "270830120", follow: true },
]) {
  test(`does not show the rewrite widget for ${scenario.name}`, async ({ page }) => {
    await openWardrobeHarness(page, scenario);
    await expect(page.locator("#quickvint-wardrobe-rewrite-widget")).toHaveCount(0);
  });
}
```

These tests catch false-positive ownership, missing fail-closed behavior, and an
accidentally active rewrite action.

- [ ] **Step 2: Run the ownership tests and verify RED**

Run the focused Playwright grep for `rewrite widget`. Expected: FAIL because the
production content script has no wardrobe widget.

- [ ] **Step 3: Implement the minimum ownership helpers**

Add prefixed constants for the widget ID, host class, and storage key. Parse only
numeric member IDs:

```js
function getVintedMemberId(pathname = location.pathname) {
  return pathname.match(/^\/member\/(\d+)(?:[-/]|$)/)?.[1] || null;
}
```

For the logged-in ID, first inspect same-origin header links with explicit
`/member/<id>` paths. Then scan inline script text for the first numeric ID
inside `initialUserState.user` or `currentUser`. Match optional escaped quotes so
the helper accepts Vinted's flight-script representation and the test fixture.
Return `null` rather than guessing.

`isOwnVintedWardrobe()` must require all of:

```js
profileId &&
currentUserId === profileId &&
!document.querySelector('[data-testid="header--login-button"]') &&
!document.querySelector('[data-testid="profile-info-follow-button"]')
```

- [ ] **Step 4: Inject the expanded widget through stable anchors**

Locate `profile-username`, its nearest `.u-flex-grow` utility container, and the
cell containing `profile-location-info`; fall back to the first sibling details
cell after the username cell. Add one prefixed host class and append:

```html
<aside id="quickvint-wardrobe-rewrite-widget" aria-labelledby="quickvint-wardrobe-rewrite-title">
  <div class="quickvint-wardrobe-rewrite-expanded">
    <button type="button" class="quickvint-wardrobe-rewrite-collapse" aria-label="Hide rewrite widget">…</button>
    <div class="quickvint-wardrobe-rewrite-copy">
      <span>AutoLister AI</span>
      <h2 id="quickvint-wardrobe-rewrite-title">Let's rewrite your listings</h2>
      <p>Refresh your titles and descriptions without starting over.</p>
      <button type="button" disabled>Rewrite my listings</button>
    </div>
    <img src="${chrome.runtime.getURL("images/wardrobe-rewrite-character.webp")}" alt="" />
  </div>
  <button type="button" class="quickvint-wardrobe-rewrite-expand" aria-label="Show rewrite widget">…</button>
</aside>
```

Start a member-page-only observer in `init()`. Stop it after the page resolves as
owner/non-owner or after a bounded timeout; do not add permanent global polling.

- [ ] **Step 5: Make the character web-accessible and verify GREEN**

Add `images/wardrobe-rewrite-character.webp` to the existing manifest resource
array. Run the focused ownership tests and confirm every match/mismatch/guard
case passes.

- [ ] **Step 6: Commit the owner-gated injection**

```bash
git add content.js manifest.json tests/e2e/extension.spec.js
git commit -m "Add own wardrobe rewrite widget"
```

### Task 2: Persistent Collapse and Responsive Legibility

**Files:**
- Modify: `content.js`
- Modify: `tests/e2e/extension.spec.js`

**Interfaces:**
- Consumes/produces: `quickvintWardrobeRewriteCollapsed: boolean` in `chrome.storage.local`
- Produces: `.is-collapsed` state on `#quickvint-wardrobe-rewrite-widget`

- [ ] **Step 1: Add failing state and layout tests**

Test that the initial stored boolean renders the compact pill, clicking the pill
expands it and writes `false`, and clicking the minimize button collapses it and
writes `true`. Trigger an unrelated DOM mutation and assert there is still one
widget.

At 1440px with extra badge rows, assert the details content and widget do not
overlap and the widget is right of the details. At 900px and 390px, assert the
widget is below the details, no document horizontal overflow exists, the heading
and toggle remain visible, and the supporting sentence is hidden only at the
narrow size.

- [ ] **Step 2: Run focused tests and verify RED**

Expected: collapse persistence/layout assertions fail because only the expanded
unstyled production markup exists.

- [ ] **Step 3: Implement collapse state and styles**

Read the stored boolean before revealing the widget. Both toggle controls update
`.is-collapsed`, their accessible expanded state, and the same storage key.

Append production CSS to the existing `injectStylesheet()` template:

- wide host: two columns, `minmax(0, 1fr) minmax(360px, 440px)`;
- expanded widget: bounded 176px card using the approved indigo/teal treatment;
- collapsed widget: right-aligned pill no taller than 48px;
- below 1100px: restore host block flow and place the widget after details;
- below 640px: keep the card at or below 148px and hide only supporting copy;
- use prefixed selectors, visible focus rings, 44px toggle targets, and a
  reduced-motion rule.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run only the rewrite-widget Playwright tests. Expected: all ownership, state,
duplicate, breakpoint, accessibility, and overflow assertions pass.

- [ ] **Step 5: Commit collapse and responsive behavior**

```bash
git add content.js tests/e2e/extension.spec.js
git commit -m "Add wardrobe widget collapse state"
```

### Task 3: Live Vinted Validation and Local Browser Handoff

**Files:**
- Create temporarily under workspace `tmp/`: live validation script/screenshots
- Do not commit temporary files

**Interfaces:**
- Consumes: production `content.js`, real `https://www.vinted.nl/member/270830120` DOM, and local character asset
- Produces: wide and narrow live-page screenshots plus geometry/ownership diagnostics

- [ ] **Step 1: Run the production widget inside the live Vinted DOM**

Navigate Chromium to the real public profile, then locally simulate only the
owner signals before loading the production content script: remove Login/Follow,
add exact `currentUser.id`, and mock `chrome.runtime.getURL()` with the character
data URL. Do not send or mutate any Vinted account data.

- [ ] **Step 2: Capture and inspect wide and narrow screenshots**

At 1440x1000 and 390x844, confirm real badges/description/actions/tabs/listings
remain readable, the wide card uses the empty right space, the narrow card
stacks cleanly, collapse remains reachable, and the page has no horizontal
overflow. Fix through another failing test if the live DOM reveals an issue.

- [ ] **Step 3: Run complete verification**

```bash
npm test
npm run build:prod
git diff --check
git status --short --branch
```

Expected: full suite and production build pass; only intended committed files
exist; branch remains unpushed.

- [ ] **Step 4: Hand off to the user's installed browser**

Keep changes local. Ask the user to reload the unpacked AutoLister extension in
Chrome and open `https://www.vinted.nl/member/270830120`. If the exact ownership
ID cannot be read in their authenticated page, collect the positive DOM/state
signal and fix the gate; never weaken it to Follow-button absence.
