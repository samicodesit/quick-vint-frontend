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

## Live Wardrobe Rewrite Smoke Test

After `npm test`, use `npm run test:live:wardrobe` when current Vinted wardrobe DOM or the production generation path needs verification. It is an opt-in test because it uses the network and one generation credit.

Read `docs/live-wardrobe-rewrite-testing.md` first. The test runs Chrome for Testing headlessly with a fresh disposable profile and must never use normal Chrome. It uses real public wardrobe DOM and the production AutoLister API, while synthetic owner identity and the existing edit-page fixture isolate Vinted's automated-login boundary.
