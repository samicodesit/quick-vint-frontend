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

Live checks are opt-in. For current authenticated Vinted create-page selectors,
reuse the latest scheduled DOM-canary production `log-detail`; do not launch a
duplicate browser flow. For the separate public-wardrobe/production-generation
hybrid, use `npm run test:live:wardrobe` (one credit). Read
`docs/real-browser-testing.md` first. Never automate CAPTCHA or save a listing.
