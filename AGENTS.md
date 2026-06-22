# Agent Instructions

This repo is mostly operated by AI agents. Treat `main` as the production frontend branch.

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
npm run package:bash
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
