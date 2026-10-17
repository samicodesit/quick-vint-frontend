# Testing Strategy

Run before pushing production frontend changes:

```bash
npm test
npm run build:prod
```

`npm test` runs:

- `npm run test:unit`
- `npm run test:e2e`

## Critical Contracts

Generation/upload changes must keep these contracts covered in `tests/e2e/extension.spec.js`:

- manual file uploads generate with `generationPayloadSource: "manual_upload_storage_url"` when temp upload succeeds.
- phone single uploads generate with `generationPayloadSource: "phone_upload_storage_url"`.
- batch uploads generate with `generationPayloadSource: "phone_upload_storage_url"`.
- visible Vinted image URLs are fallback behavior only when captured originals cannot be trusted.
- failed temp uploads block generation and show a simple user-facing message.
- the Generate button stays in a preparing/loading state while original files are uploading.

## When To Add Tests

Add or update Playwright E2E tests when touching:

- Vinted DOM selectors or upload listeners.
- image compression or temp-upload selection.
- `/api/generate` request payload shape.
- auth/session handling between popup, background, and content scripts.
- billing, checkout, paywall, or plan-limit flows.

Do not rely on unit/static tests alone for upload or generation behavior.

## Batch progress ownership

`batch-progress-ownership.spec.js` starts two real fixture batches on the same
controller and delivers old terminal/waiting messages after the second starts.
It checks unchanged controls, a continuing heartbeat, and Stop targeting the
current batch. It also rejects wrong owner, controller, item, attempt and Stop
revision snapshots. `batch-progress-stop.spec.js` holds progress delivery, clicks
Stop, and verifies no generation dispatch until a later explicit Resume.
Both run in the default browser gate. The host, storage and model are fixtures;
Chromium tabs, worker, messaging, photos and controls are real.

`batch-background-tracking.spec.js` closes the progress dialog before a
controlled host-photo rejection. The saved pause and diagnostic must retain
the same batch and generation attempt, without another generation or cleanup.
Terminal tracking must not depend on a visible progress dialog.

`batch-progress-discard.spec.js` delivers the actual earlier pause message after
failed cleanup has saved discard intent. It must not replace Retry discard with
Resume. The worker and receiver join the durable discard flag as well as the
batch, controller, item, attempt, status and Stop revision.

`batch-terminal-ack.spec.js` holds actual terminal delivery beyond its bounded
deadline. `batch-completion-routing.spec.js` closes a controller or starts a
second prepared batch before releasing, or entirely withholding, the first
completion message. Native tab focus must recover the earlier ready state and
Done must not mutate the newer batch. A bounded completion receipt is stored
atomically with the final checkpoint in the existing review map. It contains
identifiers and counts, not photos, generated text or credentials. Heartbeats
and terminal messages use that batch's proof after active recovery is replaced.

## Real-Browser Checks

Live checks are opt-in. For current authenticated Vinted create-page selectors,
reuse the latest scheduled DOM-canary production `log-detail`; do not launch a
duplicate browser flow. For the separate public-wardrobe/production-generation
hybrid, use `npm run test:live:wardrobe` (one credit). Read
`docs/real-browser-testing.md` first. Never automate CAPTCHA or save a listing.
