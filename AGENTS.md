# Agent Instructions

This repo is mostly operated by AI agents. Treat `main` as the production frontend branch.

## Checks

For production frontend pushes, use:

```bash
npm run push:production
```

That command refuses non-`main`, runs `npm test` and `npm run build:prod`, then pushes only if the gate passes. Do not use raw `git push origin main` for production frontend changes.

`npm test` runs both `test:unit` and `test:e2e`. Do not replace it with only one of those commands when touching generation, upload, auth, billing, popup, or release flow code.

For upload/generation incidents, verify the relevant E2E coverage in `tests/e2e/extension.spec.js` before changing `content.js`. The temp-upload contract is:

- manual file uploads should generate with `generationPayloadSource: "manual_upload_storage_url"` when temp upload succeeds.
- phone single uploads should generate with `generationPayloadSource: "phone_upload_storage_url"`.
- batch uploads should generate with `generationPayloadSource: "phone_upload_storage_url"`.
- visible Vinted image URLs are fallback behavior only when captured originals cannot be trusted.

See `docs/testing-strategy.md` for the frontend test map.

For agent-driven live wardrobe/relisting checks, read `docs/live-wardrobe-rewrite-testing.md`. Hard rules: use the checked-in disposable Chrome-for-Testing runner, never normal Chrome, never automate Vinted CAPTCHA, and never save a listing.

## Chrome Web Store Releases

Do not guess extension versions from memory, screenshots, old ZIP files, previous chat context, or the public Chrome Web Store listing.

Before preparing any upload, run:

```bash
npm run release:status
```

Version source of truth:

- `CHROME_WEB_STORE_VERSION` means the latest version already uploaded/submitted to Chrome Web Store.
- It does not mean only the version currently visible to public users.
- `manifest.json` must be strictly higher than `CHROME_WEB_STORE_VERSION` before packaging.
- If versions match, run `npm run release:bump`.
- If a pending uploaded package exists, do not create another package until it is resolved.

Standard agent flow:

```bash
npm run release:status
npm run build:prod
npm run package
```

When the user asks an agent in this workspace to upload or publish through the prepared pipeline, use the GitHub Actions workflow unless the user explicitly asks for a local API upload:

- Treat short requests like "release the latest extension", "publish the latest extension to store", "upload the extension", or "release/publish to Chrome Web Store" as instructions to run this pipeline end to end.
- If the user says "publish", "submit", or "release to store", use `mode=upload-and-submit`.
- If the user only says "upload", use `mode=upload`.
- Workflow: `.github/workflows/chrome-web-store-release.yml`
- `package-only`: build the ZIP artifact only.
- `upload`: upload the ZIP to Chrome Web Store without submitting for review.
- `upload-and-submit`: upload the ZIP and submit it for review.

The workflow uses the repository secret `CHROME_WEB_STORE_SERVICE_ACCOUNT_JSON` and the configured publisher/item IDs from the workflow file. Do not ask the user for Chrome Web Store OAuth tokens.

To trigger it from the CLI after committing and pushing release-ready source:

```bash
gh workflow run chrome-web-store-release.yml --ref main -f mode=upload -f bump_patch=true
```

For the common request "release/publish the latest extension to store", use:

```bash
gh workflow run chrome-web-store-release.yml --ref main -f mode=upload-and-submit -f bump_patch=true
```

Use `mode=upload-and-submit` when the user clearly asks to submit/publish/release to the store.

For local/manual uploads only, after the ZIP is uploaded/submitted to Chrome Web Store, immediately run:

```bash
npm run release:mark-uploaded
git add CHROME_WEB_STORE_VERSION
git commit -m "Mark Chrome Store upload <version>"
git push origin main
```

The GitHub Actions workflow marks the version uploaded and commits the release state automatically after a successful API upload. If you cannot access Chrome Web Store, do not run `release:mark-uploaded`. Leave the pending-release lock in place and report the exact ZIP path and version to the operator.

Release-critical fixes must land on `main`. If work was done on a feature branch that represents the published code line, fast-forward or merge `main` deliberately before finishing.

See `PUBLISH.md` for the full release runbook.

## Production Log Investigations

Before querying production/admin/Vercel logs, read and follow:

- `../quick-vint-api/docs/production-log-runbook.md`

Hard wall: production admin/API/Vercel log queries must be run with network escalation on the first attempt in Codex. Do not try sandboxed `curl`, `vercel logs`, or production helper scripts first. Use `log-detail` for request bodies and Vercel logs for endpoint-hit proof when admin logs omit successful rows.
