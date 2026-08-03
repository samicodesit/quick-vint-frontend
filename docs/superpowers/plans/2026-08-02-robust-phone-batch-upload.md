# Robust Phone and Batch Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make phone and batch uploads deterministic across slow uploads, retries, stale sessions, capacity limits, and legacy extension versions, including the failure pattern reported by Scott Singh on extension 1.3.66.

**Architecture:** Keep temporary photos and lifecycle state in the existing Supabase `temp-uploads` bucket. New extension clients use `v=2` and one `_session.json` marker registered by the authenticated desktop; the high-entropy session UUID is the temporary phone capability. Keep the legacy v1 endpoint behavior for installed extension versions 1.3.66–1.3.70, and do not add a database table, server generation queue, or restorable capacity-limited batches.

**Tech Stack:** Chrome Extension Manifest V3, plain browser JavaScript, Vercel TypeScript functions, Supabase Storage, Vitest, Playwright.

## Global Constraints

- Phone selection is editable only before **Send X photos**: users may add more photos, remove photos, and use the existing move controls.
- **Send X photos** remains visible in a fixed mobile action bar above the fold; it uses a gentle repeating glow and respects `prefers-reduced-motion`.
- Pressing Send fixes the exact photo count and order. After that, only Retry Failed Photos or Cancel Entire Upload is available.
- While a phone upload, desktop organiser, or batch generation is active, reload/close receives a native leave warning. If the user deliberately leaves, no client restoration is promised; the server expires the abandoned session.
- Single-phone upload injects the complete ordered set into Vinted once; it never injects a partial set.
- Phone batch opens the desktop organiser only after server-confirmed exact completion.
- Computer batch keeps its existing source lock and exact post-upload count check.
- The first chosen batch source owns that run. Switching source cancels the old session and creates a new session ID.
- No five-minute client timer may close a modal or make a partial upload eligible for generation.
- A v2 session expires after six hours without storage activity. Photos are removed, while an `expired` or `cancelled` marker remains for 24 hours solely to explain what happened.
- Temporary network failure is not expiration. Only an explicit server `410` response produces the expired/cancelled UI.
- Signed image URLs are refreshed once when batch generation begins and remain valid for six hours. Do not refresh before every group.
- If capacity covers only the first N groups, warn before generation that the remaining groups will not be saved. After confirmation, generate the first N and clean up the entire temporary upload.
- Do not persist or restore capacity-excluded groups. Do not detect listings posted manually after the upload.
- Do not hardcode a Vinted per-listing photo cap that can drift. If Vinted refuses a grouped photo set, stop before generation and expose Skip or Stop with the platform error.
- Do not add a database migration, upload-token utility, server generation queue, cross-device restore flow, or general UI redesign.
- v1 requests without `v=2` retain their current behavior until production usage shows that legacy support can be retired separately.
- Never log session URLs, signed image URLs, authorization headers, or photo bytes.

---

## File Map

### Extension repository: `quick-vint`

- Modify `content.js`: v2 session opening, phone polling, atomic single injection, batch idle behavior, stale-session UI, capacity copy, and local QR rendering.
- Modify `background.js`: preserve structured non-2xx status for upload polling, six-hour batch URL refresh, and active-run Retry/Skip/Stop messages.
- Modify `manifest.json`: load the local QR browser file before `content.js` and bump the release version only after verification.
- Create `lib/qrcode.min.js`: pinned MIT-licensed browser build of `qrcode-generator` 1.4.4, including its license header.
- Modify `tests/e2e/extension.spec.js`: regressions for Scott's timing, atomic handoff, stale state, capacity discard, local QR, legacy URLs, and active-run recovery.

### API/site repository: `quick-vint-api`

- Modify `api/phone-upload.ts`: additive v2 marker lifecycle, exact completion, immutable completed sessions, raster/size/order validation, explicit stale responses, and six-hour signed URLs.
- Modify `src/pages/phone-upload.html`: v2 draft/commit UI, fixed Send action, add/remove/reorder before Send, locked upload state, retry, and stale/cancelled copy.
- Modify `api/cron/daily-cleanup.ts`: v2 inactivity expiry and 24-hour tombstone removal while retaining legacy cleanup behavior.
- Modify `src/api/__tests__/phoneUpload.test.ts`: v1 compatibility and v2 lifecycle tests.
- Modify `src/api/__tests__/dailyCleanup.test.ts`: newest-activity expiry and tombstone tests.
- Create `src/pages/__tests__/phoneUploadHtml.test.ts`: static contract checks for the mobile action bar, reduced-motion rule, and v2 branch.

---

### Task 1: Add the v2 Storage-Marker Contract Without Changing v1

**Files:**
- Modify: `quick-vint-api/api/phone-upload.ts`
- Modify: `quick-vint-api/src/api/__tests__/phoneUpload.test.ts`

**Interfaces:**
- Consumes: Supabase bearer authentication already used by `api/user/batch-capacity.ts` and the existing `temp-uploads` bucket.
- Produces: `POST action=open&v=2`, `_session.json`, and explicit v2 status responses used by the phone page and extension.

- [ ] **Step 1: Write failing v2 lifecycle tests**

Add tests covering these literal contracts while leaving every existing v1 test unchanged:

```ts
// Authenticated desktop opens the capability before showing a QR.
expect(openResponse.statusCode).toBe(201);
expect(openResponse.body).toMatchObject({
  success: true,
  v: 2,
  status: "open",
  sessionId,
});

// The marker is the only new server state.
expect(uploadMock).toHaveBeenCalledWith(
  `${sessionId}/_session.json`,
  expect.any(Buffer),
  expect.objectContaining({ contentType: "application/json", upsert: false }),
);

// Missing/invalid desktop auth cannot create v2 sessions.
expect(unauthenticatedOpen.statusCode).toBe(401);

// Unknown, expired, cancelled, and completed v2 sessions reject uploads.
expect(unknownUpload.statusCode).toBe(410);
expect(expiredUpload.statusCode).toBe(410);
expect(cancelledUpload.statusCode).toBe(410);
expect(completedUpload.statusCode).toBe(409);
```

Also prove that a request without `v=2` still accepts the current `sess-test` identifier and preserves the existing response shape.

- [ ] **Step 2: Run the focused API test and verify RED**

Run:

```bash
cd /home/mests/projects/autolister/quick-vint-api
npx vitest run src/api/__tests__/phoneUpload.test.ts
```

Expected: the new v2 tests fail because `action=open`, `_session.json`, and v2 status validation do not exist.

- [ ] **Step 3: Implement the minimal v2 marker helpers**

Add these constants and types inside `api/phone-upload.ts`; do not create a general session framework:

```ts
const SESSION_MARKER = "_session.json";
const V2_SESSION_IDLE_MS = 6 * 60 * 60 * 1000;
const V2_TOMBSTONE_MS = 24 * 60 * 60 * 1000;
const SIGNED_URL_TTL_SECONDS = 6 * 60 * 60;
const MAX_V2_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_V2_SESSION_PHOTOS = 500;
const V2_SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const V2_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
]);

type V2SessionStatus = "open" | "uploading" | "complete" | "cancelled" | "expired";
type V2SessionMarker = {
  v: 2;
  ownerId: string;
  mode: "single" | "batch";
  source: "phone";
  status: V2SessionStatus;
  expectedCount: number | null;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  tombstoneUntil: string | null;
};
```

Implement `readV2Session(sessionId)` by downloading and parsing `_session.json`, and `writeV2Session(sessionId, marker, upsert)` with the existing storage client. Include `_session.json` in `isSessionMarkerFile()` so it is never returned as a photo.

- [ ] **Step 4: Add authenticated `action=open&v=2`**

Use the same bearer parsing and `supabase.auth.getUser(token)` contract as `api/user/batch-capacity.ts`. Accept only a UUID v4 and `mode=single|batch`. Write an `open` marker with a six-hour expiry and return `201`.

Repeated creation of an existing UUID returns `409`; the extension generates a new UUID rather than overwriting another session.

- [ ] **Step 5: Make v2 status explicit while preserving v1**

For v2 GET/upload/prepare/complete/cleanup:

```json
{ "v": 2, "status": "open|uploading|complete|cancelled|expired" }
```

Return `410` for `expired`, `cancelled`, or missing v2 markers. Return `409` for attempts to mutate a completed session. Keep the existing v1 branch byte-for-byte compatible in status codes and required query parameters.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run:

```bash
npx vitest run src/api/__tests__/phoneUpload.test.ts
```

Expected: all existing v1 tests and new v2 open/status tests pass.

- [ ] **Step 7: Commit the additive server contract**

```bash
git -C /home/mests/projects/autolister/quick-vint-api add api/phone-upload.ts src/api/__tests__/phoneUpload.test.ts
git -C /home/mests/projects/autolister/quick-vint-api commit -m "feat: add versioned phone upload sessions"
```

### Task 2: Enforce One Exact, Immutable v2 Upload

**Files:**
- Modify: `quick-vint-api/api/phone-upload.ts`
- Modify: `quick-vint-api/src/api/__tests__/phoneUpload.test.ts`

**Interfaces:**
- Consumes: `V2SessionMarker` and v2 status helpers from Task 1.
- Produces: idempotent ordered uploads and exact completion consumed by both the phone page and desktop poller.

- [ ] **Step 1: Write failing exactness and validation tests**

Add focused tests proving:

```ts
// First prepare fixes count; same count is idempotent; a changed count conflicts.
expect(firstPrepare.statusCode).toBe(200);
expect(repeatedPrepare.statusCode).toBe(200);
expect(changedPrepare.statusCode).toBe(409);

// Retrying order 2 overwrites 000002-upload.jpg instead of adding a photo.
expect(pathsForRetries).toEqual([
  `${sessionId}/000002-upload.jpg`,
  `${sessionId}/000002-upload.jpg`,
]);

// Completion is equality, not a lower bound.
expect(tooFew.statusCode).toBe(202);
expect(tooMany.statusCode).toBe(409);
expect(exact.statusCode).toBe(200);

// Trust-boundary failures are explicit.
expect(outOfRangeOrder.statusCode).toBe(400);
expect(oversizedPhoto.statusCode).toBe(413);
expect(svgPhoto.statusCode).toBe(415);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npx vitest run src/api/__tests__/phoneUpload.test.ts
```

Expected: v2 currently permits count changes, lacks exact equality, and lacks the v2 validation responses.

- [ ] **Step 3: Implement the fixed-count transition**

For `action=prepare&v=2`:

- Require `1 <= expectedCount <= 500`.
- Permit only an `open` marker with `expectedCount=null`, then write `status="uploading"` and the count.
- Treat the same expected count as an idempotent retry.
- Return `409` for a different count or any terminal state.

For v2 upload:

- Require the registered marker and `status="uploading"`.
- Require one file per phone request.
- Require an integer order in `[0, expectedCount)`.
- Require a listed raster MIME type and at most 4 MiB after compression.
- Construct Busboy with v2 `files: 1` and `fileSize: MAX_V2_UPLOAD_BYTES` limits, handle its limit event, and return `413` before retaining an oversized buffer.
- Keep the existing stable `000000-upload.jpg` path so retries overwrite their slot.
- Update `lastActivityAt` and `expiresAt` after a successful stored upload.

- [ ] **Step 4: Implement exact, immutable completion**

For `action=complete&v=2`, compare the stored photo count and unique stored orders with the marker count. Return `202` only while fewer slots exist, `409` when unexpected slots exist, and `200` only for exact equality. On success, write `_batch-complete.json`, set the session marker to `complete`, and reject every later upload/prepare/complete mutation.

Change signed URL creation to `SIGNED_URL_TTL_SECONDS`. This is one six-hour URL issue per list operation; no per-group refresh endpoint is added.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
npx vitest run src/api/__tests__/phoneUpload.test.ts
```

Expected: v1 compatibility, idempotent retries, validation, and exact v2 completion all pass.

- [ ] **Step 6: Commit exact completion**

```bash
git -C /home/mests/projects/autolister/quick-vint-api add api/phone-upload.ts src/api/__tests__/phoneUpload.test.ts
git -C /home/mests/projects/autolister/quick-vint-api commit -m "fix: require exact phone upload completion"
```

### Task 3: Make the v2 Phone Page a Clear Draft-to-Send Flow

**Files:**
- Modify: `quick-vint-api/src/pages/phone-upload.html`
- Create: `quick-vint-api/src/pages/__tests__/phoneUploadHtml.test.ts`

**Interfaces:**
- Consumes: `v=2`, registered session UUID, v2 prepare/upload/complete statuses.
- Produces: one immutable ordered upload initiated by a visible **Send X photos** action.

- [ ] **Step 1: Write failing static page-contract tests**

Read `src/pages/phone-upload.html` in Vitest and assert that the v2 branch contains:

```ts
expect(html).toContain("phone-upload-action-bar");
expect(html).toContain("Send ${state.files.length} photo");
expect(html).toContain("Add more photos");
expect(html).toContain("prefers-reduced-motion: reduce");
expect(html).toContain("position: fixed");
```

- [ ] **Step 2: Run the page test and verify RED**

Run:

```bash
npx vitest run src/pages/__tests__/phoneUploadHtml.test.ts
```

Expected: the v2 draft controls and sticky action-bar contract are absent.

- [ ] **Step 3: Preserve v1 and add a v2 draft state**

When the URL lacks `v=2`, keep the current automatic behavior. For v2:

- `Choose photos` appends the picker result to `state.files`.
- `Add more photos` opens the same picker and appends again.
- Existing remove and move controls remain enabled while `state.isSending === false`.
- No prepare or upload request runs during selection.
- The visible primary label is `Send X photo` or `Send X photos`.
- Register a `beforeunload` warning while draft files or an active upload exist; remove it after successful completion or explicit cancellation.

Do not add drag-and-drop, folders, revisions, draft restoration, or duplicate-file heuristics to the phone page.

- [ ] **Step 4: Add the always-visible action bar**

Use one fixed bottom action bar inside the page viewport and reserve matching bottom padding on the page content so it never covers the last thumbnail:

```css
.phone-upload-action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  background: linear-gradient(to top, #fff 78%, rgba(255,255,255,0));
}
.phone-upload-action-bar .primary:not(:disabled) {
  animation: upload-cta-glow 1.6s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .phone-upload-action-bar .primary { animation: none; }
}
```

The action remains rendered with a disabled state when zero photos are selected. When upload starts, replace its label with progress; do not let the primary action scroll away.

- [ ] **Step 5: Commit once, then lock**

On the single Send click:

1. Set `state.isSending=true` before awaiting anything.
2. Disable picker, Add, remove, and move controls.
3. Call `prepare&v=2` exactly once with the final count.
4. Compress and upload with existing concurrency/retry helpers.
5. Reject a compression fallback larger than 4 MiB with a clear per-photo failure instead of sending an oversized request.
6. Call `complete&v=2` only when every slot succeeded.
7. Keep failed slots locked and expose only **Retry Failed Photos** or **Cancel Entire Upload**.
8. On completion, make the page read-only and show **Sent to desktop**.

Map `410` to the literal copy: `This upload session expired. Its temporary photos are no longer available. Start a new phone upload from your desktop.` Map network failures to `Connection lost. Retrying…`; never call them expired.

- [ ] **Step 6: Run focused API/site checks**

Run:

```bash
npx vitest run src/pages/__tests__/phoneUploadHtml.test.ts src/api/__tests__/phoneUpload.test.ts
npm run type-check
```

Expected: static page contracts and API tests pass; TypeScript reports no errors.

- [ ] **Step 7: Commit the phone page**

```bash
git -C /home/mests/projects/autolister/quick-vint-api add src/pages/phone-upload.html src/pages/__tests__/phoneUploadHtml.test.ts
git -C /home/mests/projects/autolister/quick-vint-api commit -m "feat: lock phone uploads after send"
```

### Task 4: Remove the Five-Minute Correctness Rules and Make Single Handoff Atomic

**Files:**
- Modify: `quick-vint/content.js`
- Modify: `quick-vint/background.js`
- Modify: `quick-vint/tests/e2e/extension.spec.js`

**Interfaces:**
- Consumes: v2 open/list/status API and the existing `injectFilesIntoVinted()` function.
- Produces: session-scoped polling that waits for exact completion and injects one ordered FileList.

- [ ] **Step 1: Write Scott and atomic-handoff regressions**

Add Playwright tests proving:

- A 33-photo batch remains waiting beyond five simulated minutes and opens the organiser only after `{status:"complete", count:33, expectedCount:33}`.
- A delayed response from session A cannot alter session B.
- Single mode receiving 2/3 photos injects zero files; the later exact 3/3 completion injects one ordered three-file change.
- Closing an unfinished modal warns and cancels only after confirmation.
- Reloading the Vinted tab while a phone upload, organiser, or generation run is active raises the native leave warning; no restore state is written if the user confirms leaving.
- `410` shows an expired message and **Start new upload**; a network failure shows reconnecting and keeps the same session.
- The shared proxy preserves a structured `{status, data}` body for upload API errors so expired and cancelled remain distinguishable.
- A legacy URL without `v=2` still renders and polls using v1.

- [ ] **Step 2: Run focused Playwright tests and verify RED**

Run:

```bash
cd /home/mests/projects/autolister/quick-vint
npx playwright test tests/e2e/extension.spec.js --grep "Scott upload|atomic phone handoff|expired phone session|legacy phone upload"
```

Expected: the five-minute and progressive-injection regressions fail before implementation.

- [ ] **Step 3: Open v2 sessions before rendering QR links**

Use `crypto.randomUUID()` for new v2 phone session IDs. Fetch `GET_ACCESS_TOKEN`, then call:

```text
POST /api/phone-upload?action=open&v=2&sessionId=<uuid>&mode=single|batch
Authorization: Bearer <supabase access token>
```

Only render the QR/link after `201`. On failure, show a retryable desktop error rather than falling back to v1. Append `v=2` to new phone-page URLs. Existing extension builds continue producing v1 URLs.

- [ ] **Step 4: Delete both five-minute correctness branches**

Remove `BATCH_UPLOAD_IDLE_TIMEOUT_MS`, `PHONE_UPLOAD_PENDING_GENERATE_BLOCK_MS`, `scheduleBatchAutoClose()`, `schedulePhoneUploadAutoClose()`, and their timer cleanup state. Keep explicit Cancel/Close actions and server expiry.

An unfinished single or batch modal must remain open while the client can reconnect. Do not infer expiration from elapsed client time.

- [ ] **Step 5: Gate single injection on exact completion**

In `startPolling(sessionId)`:

- Poll immediately, then every three seconds and on `visibilitychange` back to visible.
- Ignore every response unless `activePhoneUploadSessionId === sessionId` after each await.
- Do not download or inject while status is open/uploading or count differs from expected count.
- On exact completion, sort the full remote file list by `order`, download all files, and inject only if every download succeeds.
- Call `injectFilesIntoVinted()` once with the full ordered array.
- If any download fails, keep the session and retry the full handoff; do not inject the successful subset.

Keep batch polling's existing post-await session guard and require the same exact-complete condition before `renderBatchGroupingPhase()`.

- [ ] **Step 6: Add explicit terminal UI**

Use response status, not elapsed time:

- `410 expired`: explain that temporary photos are no longer available and show **Start new upload**.
- `410 cancelled`: explain cancellation and show **Start new upload**.
- `404/invalid`: show **This upload link is no longer valid**.
- Fetch/network error: show **Connection lost. Retrying…** and continue polling.

Update `PROXY_FETCH` to parse JSON/text before its `response.ok` branch and return `{ok:false,status,data,error}` for non-2xx responses. Preserve its existing success and blob contracts, and cover one unrelated non-upload 4xx call so this shared change cannot silently regress other callers.

Starting again cancels the old session and opens a new UUID; it never reuses or revises the old photo set.

Register `beforeunload` only while the single modal, batch organiser, or batch generation is active, and remove the listener on every terminal path. This is a warning boundary, not a restore mechanism.

- [ ] **Step 7: Run focused tests and verify GREEN**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "Scott upload|atomic phone handoff|expired phone session|legacy phone upload"
```

Expected: all focused extension regressions pass.

- [ ] **Step 8: Commit session correctness**

```bash
git -C /home/mests/projects/autolister/quick-vint add content.js background.js tests/e2e/extension.spec.js
git -C /home/mests/projects/autolister/quick-vint commit -m "fix: make phone upload completion atomic"
```

### Task 5: Keep Batch Generation Primitive and Explicit

**Files:**
- Modify: `quick-vint/content.js`
- Modify: `quick-vint/background.js`
- Modify: `quick-vint/tests/e2e/extension.spec.js`

**Interfaces:**
- Consumes: exact completed batch files and existing `START_BATCH_GENERATION`/`RUN_BATCH_ITEM` messages.
- Produces: explicit capacity discard and same-modal failure controls without persistent job machinery.

- [ ] **Step 1: Write failing capacity and failure-control tests**

Add tests proving:

```text
You can generate 3 of 10 listings. Only the first 3 will be generated. The remaining 7 photos/groups will not be saved.
```

Assert that Cancel returns to the organiser, Continue submits only the first three groups, successful completion cleans the whole session, and no restore metadata is written to `chrome.storage`.

Add active-modal tests for:

- A known pre-generation failure exposes Retry, Skip, and Stop.
- Retry starts at the failed item and never repeats completed items.
- An ambiguous failure after `/api/generate` starts hides Retry and exposes only Skip and Stop.
- A Vinted photo-input rejection, including a platform photo-count refusal, happens before `/api/generate`, hides Retry, and exposes Skip and Stop with the returned Vinted error.
- Stop confirms discard and cleans the current upload.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "capacity discard|batch Retry Skip Stop|ambiguous batch failure"
```

Expected: explicit discard copy and active-run recovery controls are absent.

- [ ] **Step 3: Tighten capacity copy without adding preservation**

Keep the existing capacity lookup and first-N slicing. Replace the confirmation with the explicit total/available/discard message. Keep group order as the order shown in the organiser.

After successful first-N generation, call existing session cleanup once. Do not save remaining groups, add a restore screen, or infer whether the user later posted them manually.

- [ ] **Step 4: Add current-run-only Retry, Skip, and Stop**

Extend failure progress with `itemIndex` and `retrySafe`:

```js
{
  status: "failed",
  itemIndex: 4,
  total: 10,
  retrySafe: true,
  message: "Could not open the Vinted listing form."
}
```

Mark failures before `/api/generate` as retry-safe. Once generation has started and the response is missing, mark the result ambiguous and do not offer Retry. Retry/Skip operates only while the original organiser modal and in-memory groups remain open. No job state is written to server storage or `chrome.storage`.

Treat a deterministic Vinted input refusal as non-retryable even though it occurs before generation: retrying unchanged photos cannot help. Show the platform error and only Skip or Stop.

- [ ] **Step 5: Refresh URLs once at batch start**

Keep the existing `refreshBatchSignedUrlsBeforeStart()` boundary. The API now issues six-hour URLs, so remove no URL checks and add no per-group fetch. If the single pre-start refresh fails, leave the organiser open and show Retry; do not start generation with stale URLs.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "capacity discard|batch Retry Skip Stop|ambiguous batch failure|refreshes stale batch signed URLs before start"
```

Expected: all selected batch tests pass with no persistent job state.

- [ ] **Step 7: Commit primitive batch recovery**

```bash
git -C /home/mests/projects/autolister/quick-vint add content.js background.js tests/e2e/extension.spec.js
git -C /home/mests/projects/autolister/quick-vint commit -m "fix: make batch failure actions explicit"
```

### Task 6: Generate QR Locally Without a Runtime Dependency

**Files:**
- Create: `quick-vint/lib/qrcode.min.js`
- Modify: `quick-vint/manifest.json`
- Modify: `quick-vint/content.js`
- Modify: `quick-vint/tests/e2e/extension.spec.js`

**Interfaces:**
- Consumes: the v2 phone URL after authenticated session opening.
- Produces: a local QR `<img>`/SVG and no request to `api.qrserver.com`.

- [ ] **Step 1: Write the failing local-QR test**

Open both single and batch QR modals. Assert that a QR image is rendered and that the browser made zero requests whose hostname is `api.qrserver.com`.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "renders phone QR locally"
```

Expected: requests currently target `api.qrserver.com`.

- [ ] **Step 3: Vendor one pinned browser file**

Add the upstream browser build from `qrcode-generator` 1.4.4 as `lib/qrcode.min.js`, retaining its MIT license header. Do not add an npm runtime dependency or QR abstraction. Add `lib/qrcode.min.js` immediately before `content.js` in `manifest.json`; the existing packaging script already includes `lib/`.

- [ ] **Step 4: Replace both external QR images**

Use the library directly in one shared content-script helper:

```js
function renderQrCode(container, value, alt) {
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();
  const img = document.createElement("img");
  img.src = qr.createDataURL(4, 0);
  img.alt = alt;
  container.replaceChildren(img);
}
```

Call it for single and batch. If rendering throws, show **Could not create QR code. Start a new upload.** Do not send the URL to another service as fallback.

- [ ] **Step 5: Run focused QR and packaging checks**

Run:

```bash
npx playwright test tests/e2e/extension.spec.js --grep "renders phone QR locally"
npm run build:prod
```

Expected: both QR tests pass and the production package build sees the vendored `lib` asset.

- [ ] **Step 6: Commit local QR generation**

```bash
git -C /home/mests/projects/autolister/quick-vint add lib/qrcode.min.js manifest.json content.js tests/e2e/extension.spec.js
git -C /home/mests/projects/autolister/quick-vint commit -m "fix: keep phone upload QR local"
```

### Task 7: Make Expiry Explainable Without Retaining Photos

**Files:**
- Modify: `quick-vint-api/api/phone-upload.ts`
- Modify: `quick-vint-api/api/cron/daily-cleanup.ts`
- Modify: `quick-vint-api/src/api/__tests__/phoneUpload.test.ts`
- Modify: `quick-vint-api/src/api/__tests__/dailyCleanup.test.ts`

**Interfaces:**
- Consumes: v2 `_session.json` lifecycle and legacy folder cleanup.
- Produces: six-hour inactivity expiry, 24-hour reason markers, and truthful explicit cleanup responses.

- [ ] **Step 1: Write failing expiry and cleanup tests**

Cover these cases:

- A v2 session whose newest photo/marker activity is under six hours remains untouched.
- A v2 session inactive for more than six hours has photo files and completion/count markers removed; `_session.json` remains with `status="expired"` and `tombstoneUntil` 24 hours later.
- An expired marker older than 24 hours is removed.
- `cleanup&v=2&reason=cancelled` deletes photos and leaves a cancelled marker for 24 hours.
- `cleanup&v=2&reason=completed` removes the whole session immediately.
- A storage removal error returns a non-2xx response and `success:false`.
- Legacy folders continue using the existing six-hour deletion behavior.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
npx vitest run src/api/__tests__/phoneUpload.test.ts src/api/__tests__/dailyCleanup.test.ts
```

Expected: the current cleanup deletes all markers, uses the oldest file, and reports success on deletion failure.

- [ ] **Step 3: Implement v2 inactivity and tombstones**

For v2 folders, calculate activity from the newest valid `updated_at`/`created_at` among the session marker and photo objects. When inactive for six hours:

1. Write `_session.json` as expired with no photo names or URLs.
2. Delete every other session object.
3. Keep the marker for 24 hours.
4. Delete the marker after `tombstoneUntil`.

Do not retain thumbnails, filenames, signed URLs, group definitions, or photo bytes in tombstones.

Reuse the same expiry helper from v2 GET/upload/prepare/complete: if `expiresAt` has passed before the hourly cron runs, mark the session expired and attempt the same photo cleanup immediately. Return `410` even if the deletion must be retried by cron; the user-facing copy says the temporary photos are no longer available rather than claiming every object was already removed.

- [ ] **Step 4: Make explicit cleanup truthful**

Change `handleCleanup` so storage deletion failure returns `500` with `{success:false,error:"Could not clean up upload session"}`. The client may retry. Keep successful completed cleanup idempotent.

Before uncommenting cron authorization enforcement, run `vercel env ls` and confirm `CRON_SECRET` exists in Production. If it exists, enforce the current bearer check and add its 401 test. If it does not exist, leave the check unchanged and report the deployment prerequisite; do not deploy a cron-breaking authorization change.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
npx vitest run src/api/__tests__/phoneUpload.test.ts src/api/__tests__/dailyCleanup.test.ts
```

Expected: v2 expiry, tombstones, truthful cleanup, and legacy cleanup all pass.

- [ ] **Step 6: Commit lifecycle cleanup**

```bash
git -C /home/mests/projects/autolister/quick-vint-api add api/phone-upload.ts api/cron/daily-cleanup.ts src/api/__tests__/phoneUpload.test.ts src/api/__tests__/dailyCleanup.test.ts
git -C /home/mests/projects/autolister/quick-vint-api commit -m "fix: explain expired upload sessions"
```

### Task 8: Compatibility, Scott Regression, and Ordered Rollout

**Files:**
- Modify after verification: `quick-vint/manifest.json`
- Verify: both repositories and production log bodies.

**Interfaces:**
- Consumes: all prior tasks.
- Produces: additive backend deployment followed by a verified extension 1.3.71 package.

- [ ] **Step 1: Run complete API verification**

Run:

```bash
cd /home/mests/projects/autolister/quick-vint-api
npm run lint
npm run type-check
npm run build
npm run format-check
npm test
```

Expected: all commands exit zero.

- [ ] **Step 2: Run complete extension verification**

Run:

```bash
cd /home/mests/projects/autolister/quick-vint
npm run test:unit
npm run test:e2e
npm run build:prod
```

Expected: all commands exit zero.

- [ ] **Step 3: Run the compatibility matrix before extension release**

Against the locally built/new API, verify:

1. Extension 1.3.66 single and batch QR URLs without `v=2` still upload and poll.
2. Extension 1.3.70 single and batch flows still work unchanged.
3. Extension 1.3.71 uses UUID sessions and `v=2` only.
4. A v1 upload already in progress continues through the API deployment.
5. A v2 network interruption reconnects to the same session.
6. A v2 session explicitly expired by the test harness returns 410 and offers Start new upload.

Do not remove or tighten the v1 branch during this release.

- [ ] **Step 4: Reproduce Scott's exact timing boundary**

Run the focused Playwright fixture with:

- extension version 1.3.66 behavior fixture,
- 33 ordered photos,
- a delayed old-session poll response,
- a replacement session,
- 306 seconds of simulated idle time,
- exact completion after the delay.

Expected on the legacy fixture: stale/timeout regression fails as documented. Expected on 1.3.71: the old response is ignored, the modal remains active beyond five minutes, all 33 photos appear once, and the organiser opens only after exact completion.

- [ ] **Step 5: Deploy API/site first and inspect production bodies**

Deploy `quick-vint-api` before publishing the extension. Follow `docs/production-log-runbook.md`; use `log-detail` for `action=open`, `prepare`, `complete`, `expired`, and `cleanup` bodies. Confirm no session URL, authorization header, signed photo URL, or photo content appears in logs.

Keep the production extension on 1.3.70 during this server observation window and smoke-test its v1 single and batch flows.

- [ ] **Step 6: Bump, package, and verify extension 1.3.71**

Run:

```bash
cd /home/mests/projects/autolister/quick-vint
npm run release:bump
npm run package
unzip -t dist/autolister-ai-v1.3.71.zip
npm run release:status
git diff --check
git status --short --branch
```

Expected: manifest version is 1.3.71, ZIP integrity passes, and the release status identifies 1.3.71 as pending.

- [ ] **Step 7: Final reviewer gate**

Reject the release if any of these are true:

- A partial single set reaches Vinted.
- The organiser opens before exact batch completion.
- Any five-minute client correctness cutoff remains.
- A stale response changes a newer session.
- A network error is labelled expired.
- Send scrolls off a small phone viewport.
- Capacity-excluded groups appear recoverable.
- v1 tests fail.
- A QR request reaches an external host.
- Cleanup reports success after storage deletion failed.

- [ ] **Step 8: Commit release metadata separately**

```bash
git -C /home/mests/projects/autolister/quick-vint add manifest.json CHROME_WEB_STORE_PENDING_VERSION
git -C /home/mests/projects/autolister/quick-vint commit -m "chore: prepare extension 1.3.71"
```

---

## Final Acceptance Criteria

- Scott's stale-response condition is reproduced on 1.3.66 and absent on 1.3.71.
- A phone upload may take longer than five minutes without being closed or treated as complete.
- Users may add, remove, and reorder photos before Send; the action remains visible on small screens.
- After Send, count and order are immutable; retries overwrite the same slots.
- Single mode performs one complete injection; batch mode performs one exact handoff to the organiser.
- Capacity warnings are explicit and excluded groups are deleted, not preserved.
- Expired/cancelled sessions explain what happened without retaining photos.
- Current-run batch failures cannot automatically retry an ambiguous paid generation.
- Old extension versions remain operational through the v1 branch.
- No database, queue, persistent batch recovery, or per-group URL refresh was introduced.
