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

After the ZIP is uploaded/submitted to Chrome Web Store, immediately run:

```bash
npm run release:mark-uploaded
git add CHROME_WEB_STORE_VERSION
git commit -m "Mark Chrome Store upload <version>"
git push origin main
```

If you cannot access Chrome Web Store, do not run `release:mark-uploaded`. Leave the pending-release lock in place and report the exact ZIP path and version to the operator.

Release-critical fixes must land on `main`. If work was done on a feature branch that represents the published code line, fast-forward or merge `main` deliberately before finishing.

See `PUBLISH.md` for the full release runbook.

## Production Log Investigations

Before querying production/admin/Vercel logs, read and follow:

- `../quick-vint-api/docs/production-log-runbook.md`

Hard wall: production admin/API/Vercel log queries must be run with network escalation on the first attempt in Codex. Do not try sandboxed `curl`, `vercel logs`, or production helper scripts first. Use `log-detail` for request bodies and Vercel logs for endpoint-hit proof when admin logs omit successful rows.
