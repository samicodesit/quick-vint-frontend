# Wardrobe Widget Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add calm, geometry-aware reveal, collapse, and expansion animation to the wardrobe rewrite widget and make its minimize control unmistakable.

**Architecture:** Keep the existing widget DOM and ownership gate. Use the native Web Animations API for a FLIP transform between measured rectangles, animate host height to move following Vinted content smoothly, and crossfade the state content. CSS supplies the reveal keyframes and stronger minimize control; JavaScript skips motion under `prefers-reduced-motion`.

**Tech Stack:** Existing extension content script, DOM/Web Animations API, CSS, Playwright.

## Global Constraints

- No dependencies.
- Collapse/expand duration is 420ms with `cubic-bezier(.22, 1, .36, 1)`.
- First reveal duration is 360ms from 10px below, 0.98 scale, and zero opacity.
- `prefers-reduced-motion: reduce` applies state immediately with no animation.
- Do not wire the rewrite CTA or add modal behavior.

---

### Task 1: Motion and clearer minimize control

**Files:**
- Modify: `content.js:9360-9608`
- Modify: `content.js:15982-16075`
- Test: `tests/e2e/extension.spec.js:5777-5905`

**Interfaces:**
- Consumes: existing `setCollapsed(collapsed, persist)` and `fitToViewport()` widget-local functions.
- Produces: widget reveal animation, FLIP collapse/expand animation, host-height animation, content crossfade, and SVG minimize control.

- [ ] **Step 1: Write failing Playwright tests**

Add assertions that the first resolved widget has an active reveal animation; collapse and expansion create an active transform animation whose midpoint rectangle is between the start and end rectangles; the host has an active height animation; reduced-motion creates no animations; and the minimize button contains an SVG and computes to at least 40×40px.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "wardrobe rewrite widget"
```

Expected: the new reveal, FLIP, host-height, reduced-motion, and minimize-control assertions fail while existing owner and responsive assertions remain green.

- [ ] **Step 3: Implement the minimum motion**

In `content.js`, add a 360ms reveal keyframe and visible 40px minimize button styles. Replace the text minus with an inline SVG. Add one widget-local `animateStateChange(collapsed)` function that measures the widget and host before/after the class change, calls `fitToViewport()`, and uses `element.animate()` for the inverse transform, host height, and incoming content opacity. Make `setCollapsed` call it only for user actions and apply immediately for initial storage state or reduced motion.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the focused command from Step 2. Expected: all wardrobe widget tests pass.

- [ ] **Step 5: Commit**

```bash
git add content.js tests/e2e/extension.spec.js
git commit -m "Animate wardrobe rewrite widget"
```

### Task 2: Live layout and regression verification

**Files:**
- Verify: `content.js`
- Verify: `manifest.json`
- Verify: `tests/e2e/extension.spec.js`

**Interfaces:**
- Consumes: completed animated widget.
- Produces: verified production build and live Vinted visual result.

- [ ] **Step 1: Run the live Vinted visual check**

Run `node tmp/visual-check-wardrobe-widget.cjs` from the parent workspace and inspect wide, medium, narrow, and collapsed screenshots. Confirm the card stays in its current placement and the stronger minimize control is legible.

- [ ] **Step 2: Run full verification**

```bash
npm test
npm run build:prod
git status --short --branch
```

Expected: 32 unit tests and 116 or more browser tests pass, production build succeeds, and the frontend worktree is clean after generated production output settles.
