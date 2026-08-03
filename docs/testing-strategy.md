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

## Real-Browser Checks

Do not run live checks for ordinary verification. After `npm test`, use the
smallest named live check only when the user explicitly asks for real/live
testing or the change requires current external Vinted DOM, authentication, or
production-integration proof that fixtures cannot provide:

- `npm run test:live -- listing-create` verifies current selectors on the real authenticated Vinted create page using the dedicated canary profile.
- `npm run test:live -- wardrobe-rewrite` verifies the real public wardrobe DOM and production generation through the documented hybrid boundary; it consumes one generation credit.

Read `docs/real-browser-testing.md` first. All ordinary checks are headless,
use Chrome for Testing, never control normal Chrome, and never save a listing.
