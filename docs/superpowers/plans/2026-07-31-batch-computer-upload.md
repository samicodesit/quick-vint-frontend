# Batch Computer Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a polished batch source screen where users can immediately scan a QR code or upload loose photos/a folder from their computer, then manually group every image in the existing organizer.

**Architecture:** Keep `content.js` as the single frontend implementation point and reuse the existing temporary-storage and batch-generation pipeline. Computer selections are flattened into ordered image `File` objects, uploaded into a fresh batch session, normalized into the existing `batchRemoteFiles` shape, and handed to the unchanged organizer and worker flow.

**Tech Stack:** Chrome Extension Manifest V3 content script, browser File/Drag-and-Drop APIs, existing `/api/phone-upload` temporary-storage endpoint, Playwright E2E tests, existing CSS-in-JS styles.

## Global Constraints

- Keep the existing `Phone` button and `1 item` / `Multiple items` chooser.
- Show QR and computer upload controls together; add no source-selection modal.
- Support dropped files, recursively dropped folders, multiple-file picking, and directory picking.
- Never infer listing groups from directories, names, or image order.
- Reuse temporary storage and the existing manual grouping and batch worker flows.
- Add no dependency or API endpoint.
- Prevent mixed phone/computer sessions.
- Inspect and refine desktop and mobile rendering before presenting.
- Do not push before user review.

---

### Task 1: Direct Batch Source Screen

**Files:**
- Modify: `content.js` (`resetBatchState`, batch modal CSS, `renderBatchUploadPhase`, `renderBatchUploadStrip`)
- Test: `tests/e2e/extension.spec.js`

**Interfaces:**
- Produces: `.batch-source-phone`, `.batch-computer-dropzone`, `.batch-computer-files-input`, and `.batch-computer-folder-input` DOM hooks.
- Produces: `batchInputSource` with values `null`, `"phone"`, or `"computer"`.
- Consumes: existing `getBatchUploadUrl(sessionId)`, QR rendering, polling state, and modal close behavior.

- [ ] **Step 1: Write the failing source-layout E2E test**

Add a test that opens `Multiple items` and asserts the batch modal immediately contains:

```js
const modal = page.locator("#quickvint-batch-modal");
await expect(modal.locator(".batch-source-phone img")).toBeVisible();
await expect(modal.locator(".batch-computer-dropzone")).toContainText(
  "Drop photos or a folder",
);
await expect(modal.locator(".batch-computer-files-input")).toHaveAttribute(
  "multiple",
  "",
);
await expect(modal.locator(".batch-computer-folder-input")).toHaveAttribute(
  "webkitdirectory",
  "",
);
await expect(modal.locator(".batch-source-choice")).toHaveCount(0);
```

Also assert that the modal and both actions are inside the viewport at desktop
and 390x844 mobile widths, with no document horizontal overflow.

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "shows phone and computer batch sources"
```

Expected: FAIL because the computer source controls do not exist.

- [ ] **Step 3: Implement the minimal direct source shell**

Initialize the source in `resetBatchState()`:

```js
batchInputSource = null;
batchComputerUploadPromise = null;
batchComputerUploadAbortController = null;
```

Replace the waiting-only right panel in `renderBatchUploadPhase()` with one
two-column source grid. Keep the QR visible and add:

```html
<section class="batch-source-panel batch-source-computer">
  <div class="batch-source-kicker">This computer</div>
  <label class="batch-computer-dropzone" tabindex="0">
    <input class="batch-computer-files-input" type="file" accept="image/*" multiple />
    <span class="batch-computer-icon" aria-hidden="true">...</span>
    <strong>Drop photos or a folder</strong>
    <span>or choose them from this computer</span>
  </label>
  <div class="batch-computer-actions">
    <button type="button" class="primary batch-choose-files">Choose photos</button>
    <button type="button" class="batch-choose-folder">Choose folder</button>
    <input class="batch-computer-folder-input" type="file" accept="image/*" webkitdirectory multiple hidden />
  </div>
</section>
```

Use buttons to click the corresponding hidden inputs. Preserve the existing QR
loading placeholder and phone polling. Add focused styles for hierarchy,
44-pixel tap targets, keyboard focus, drag-hover state, balanced desktop
columns, and stacked mobile layout. Do not add assets or dependencies.

- [ ] **Step 4: Run the focused layout test and verify it passes**

Run the command from Step 2. Expected: PASS at desktop and mobile widths.

- [ ] **Step 5: Commit the source shell**

```bash
git add content.js tests/e2e/extension.spec.js
git commit -m "Add direct batch source screen"
```

---

### Task 2: Computer File and Folder Selection

**Files:**
- Modify: `content.js` (temporary-storage listing helper and batch upload logic)
- Test: `tests/e2e/extension.spec.js`

**Interfaces:**
- Produces: `isBatchImageFile(file): boolean`.
- Produces: `sortBatchComputerFiles(files): File[]` using `webkitRelativePath` or the recorded dropped relative path with `{ numeric: true, sensitivity: "base" }` comparison.
- Produces: `getDroppedBatchFiles(dataTransfer): Promise<File[]>`.
- Produces: `startBatchComputerUpload(files): Promise<void>`.
- Consumes: `compressFileForStorageUpload`, `mapWithConcurrency`, `normalizeBatchRemoteFiles`, `renderBatchGroupingPhase`, and the `/api/phone-upload` contract.

- [ ] **Step 1: Write failing E2E tests for loose files and folder input**

Route direct `/api/phone-upload` POSTs and GET listing responses. Select two
files through `.batch-computer-files-input`, then assert:

```js
await expect(modal.locator(".batch-computer-progress")).toContainText("Uploading");
await expect(modal.locator(".batch-gallery .batch-photo")).toHaveCount(2);
await expect(modal.locator(".batch-title")).toHaveText("Organize items");
expect(uploadRequests).toHaveLength(2);
```

Set two files on `.batch-computer-folder-input`, assign deterministic
`webkitRelativePath` values in page context, and prove the same organizer path
is used. Assert that no batch group exists until the user selects photos and
clicks `Group photos`.

- [ ] **Step 2: Run the selection tests and verify they fail**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "computer batch upload"
```

Expected: FAIL because selecting either input does nothing.

- [ ] **Step 3: Generalize the existing storage listing helper**

Extract the existing GET/list/sort portion of `listManualTempStorageUrls` into:

```js
async function listTempStorageFiles(sessionId) {
  const response = await fetch(
    `${PHONE_UPLOAD_API}?sessionId=${encodeURIComponent(sessionId)}&t=${Date.now()}`,
    { method: "GET" },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || `Upload list failed (${response.status})`);
  }
  return normalizeBatchRemoteFiles(getPhoneUploadPhotoFiles(data?.files));
}
```

Keep `listManualTempStorageUrls(sessionId)` as a thin `.map(file => file.url ||
null)` wrapper so existing manual-upload behavior stays unchanged.

- [ ] **Step 4: Implement file normalization and folder traversal**

Filter selections at the trust boundary:

```js
function isBatchImageFile(file) {
  return file instanceof File &&
    (file.type.startsWith("image/") || /\.(avif|gif|heic|heif|jpe?g|png|webp)$/i.test(file.name));
}
```

For dropped directories, use `DataTransferItem.webkitGetAsEntry()`. Read a
directory repeatedly until `readEntries()` returns an empty array, recurse into
children, record each full relative path on the returned file, and flatten all
images. Fall back to `dataTransfer.files` when entry APIs are unavailable.

- [ ] **Step 5: Upload selected files into a fresh batch session**

`startBatchComputerUpload(files)` must:

1. Ignore an empty/unsupported selection with `Add image files to continue.`.
2. Lock `batchInputSource` to `"computer"`.
3. Stop phone polling, replace the QR session with a new session ID, and clean
   up the unused QR session.
4. Render `Preparing 0 of N` / `Uploading X of N` progress in the computer
   panel.
5. Reuse bounded-concurrency compression and temporary upload in selection
   order.
6. Call `listTempStorageFiles`, require exactly N ordered files, assign
   `batchRemoteFiles`, mark `batchIsComplete = true`, preload, and call
   `renderBatchGroupingPhase()`.

Wire both inputs and the drop zone to this function. Reset input values after
reading so the same selection can be retried.

- [ ] **Step 6: Run selection tests and existing manual upload coverage**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "computer batch upload|manual captured files"
```

Expected: PASS. Manual generation still reports
`manual_upload_storage_url`; batch computer selection reaches the organizer.

- [ ] **Step 7: Commit computer selection**

```bash
git add content.js tests/e2e/extension.spec.js
git commit -m "Upload batch photos from computer"
```

---

### Task 3: Source Locking, Failure, and Trusted Generation

**Files:**
- Modify: `content.js` (polling, close warning/cleanup, progress/error state)
- Test: `tests/e2e/extension.spec.js`

**Interfaces:**
- Consumes: `batchInputSource`, `batchComputerUploadPromise`, and `batchComputerUploadAbortController` from Tasks 1–2.
- Preserves: batch worker `phone_upload_batch` captured source and `phone_upload_storage_url` generation payload source.

- [ ] **Step 1: Write failing source-lock and failure tests**

Add focused tests proving:

```js
// Phone wins after its first file arrives.
await expect(modal.locator(".batch-choose-files")).toBeDisabled();

// Computer wins immediately after selection.
expect(await page.evaluate(() => window.__batchPhonePollCount)).toBe(pollsBeforeSelection);

// Failed upload stays on the source screen.
await expect(modal.locator(".batch-computer-error")).toContainText(
  "Could not upload every photo. Try again.",
);
await expect(modal.locator(".batch-gallery")).toHaveCount(0);
```

Complete a successful computer upload, manually create a group, start batch
generation, and assert the worker receives signed storage URLs rather than
blob/data URLs.

- [ ] **Step 2: Run focused tests and verify they fail**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "locks batch source|computer batch upload failure|generates computer batch"
```

Expected: FAIL until source ownership and errors are implemented.

- [ ] **Step 3: Lock the source and make closing safe**

When polling receives its first phone file, set `batchInputSource = "phone"`
and disable computer controls with concise `Receiving from phone` feedback.
When computer selection begins, stop polling before uploading.

Extend `shouldWarnBeforeClosingBatch()` to include an active computer upload.
Abort queued/in-flight fetches when the user confirms close; defer cleanup of
the computer session until the upload promise settles so cleanup cannot race a
late upload. Ensure async completion checks that the modal and session are
still current before rendering the organizer.

- [ ] **Step 4: Render recoverable errors**

On validation failure, keep both sources usable. On compression/upload/list
failure, keep the computer panel visible, render `Could not upload every photo.
Try again.`, reset `batchInputSource` after cleanup, and allow reselection. Do
not populate `batchRemoteFiles` or enter the organizer with a partial set.

- [ ] **Step 5: Run focused tests and verify they pass**

Run the command from Step 2. Expected: PASS, including signed storage URL
assertions.

- [ ] **Step 6: Commit resilient source handling**

```bash
git add content.js tests/e2e/extension.spec.js
git commit -m "Guard batch upload source and recovery"
```

---

### Task 4: Visual Inspection and Refinement

**Files:**
- Modify if inspection finds issues: `content.js` (batch source CSS/copy only)
- Test: `tests/e2e/extension.spec.js`
- Create locally, do not commit: `tmp/batch-upload-desktop.png`, `tmp/batch-upload-mobile.png`

**Interfaces:**
- Consumes: completed source screen from Tasks 1–3.
- Produces: visual evidence at 1280x900 and 390x844.

- [ ] **Step 1: Capture the real rendered source screen**

Use the existing Playwright content harness to open `Multiple items` at
1280x900 and 390x844. Capture the modal screenshots to `tmp/` and inspect both
images, not only DOM assertions.

- [ ] **Step 2: Review against explicit UI criteria**

Verify visually and via computed bounds:

- QR and computer upload have clear, equal source hierarchy.
- `Choose photos` is obvious; `Choose folder` is visible without competing.
- Drop-zone boundary, typography, and spacing look intentional rather than
  form-like or crowded.
- Close, focus, hover/drag, progress, and error states are legible.
- Mobile stacking has no clipped QR, controls, footer, or horizontal overflow.
- Existing organizer remains visually unchanged.

- [ ] **Step 3: Refine only observed issues**

Adjust existing source-screen CSS and copy directly. Do not introduce a design
component abstraction, new asset, or animation framework.

- [ ] **Step 4: Re-capture and re-inspect after refinement**

Overwrite both `tmp/` screenshots, inspect them again, and retain the final
images for the user presentation.

- [ ] **Step 5: Commit visual refinements if code changed**

```bash
git add content.js tests/e2e/extension.spec.js
git commit -m "Refine batch computer upload UI"
```

---

### Task 5: Completion Verification and Presentation

**Files:**
- Verify: `content.js`, `tests/e2e/extension.spec.js`, `manifest.json`
- Present: final screenshots from `tmp/`

**Interfaces:**
- Produces: test/build evidence and an unpushed local commit series ready for user review.

- [ ] **Step 1: Run formatting/static diff checks**

```bash
git diff --check HEAD~4..HEAD
git status --short
```

Expected: no whitespace errors and no unexpected files.

- [ ] **Step 2: Run the complete required frontend gate**

```bash
npm test
npm run build:prod
```

Expected: unit and full Playwright E2E suites pass; production build succeeds.

- [ ] **Step 3: Audit requirements against authoritative evidence**

Match every design requirement to the rendered screenshots, focused E2E
assertions, full test output, production build output, and final source diff.
Treat any missing evidence as incomplete and fix/retest it.

- [ ] **Step 4: Present without pushing**

Show the user the final desktop/mobile screenshots, summarize the verified
behavior, name any deliberately skipped scope, and explicitly state that the
commits remain local and nothing was pushed.
