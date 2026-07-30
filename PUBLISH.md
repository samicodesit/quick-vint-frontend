# AI Agent Publish Runbook (Chrome Web Store)

This runbook is written for AI agents. The human operator should not have to decide the next extension version manually.

Never infer the next version from memory, previous chat context, old ZIP files, or the public Chrome Web Store listing. Always use the release commands below.

Use the Node packaging script:

- `npm run package` -> runs `node build.js`

This is the cross-platform release path for Windows and macOS. It preserves Chrome extension folder paths such as `icons/`, `_locales/`, and `lib/`.

## Version rule

The source of truth for version bumping is the latest version uploaded or submitted to Chrome Web Store:

```bash
CHROME_WEB_STORE_VERSION
```

Before preparing an upload, check the next required version:

```bash
npm run release:status
```

If the store already has the same version as `manifest.json`, bump automatically:

```bash
npm run release:bump
```

Packaging will fail if `manifest.json` is not higher than `CHROME_WEB_STORE_VERSION`.

After you upload the ZIP to Chrome Web Store, mark that version as uploaded:

```bash
npm run release:mark-uploaded
```

Packaging creates a local pending-release lock. Until you run `release:mark-uploaded`, the next package build will fail and remind you to finish the previous upload.

If you created a package but decided not to upload it:

```bash
npm run release:clear-pending
```

Commit and push the `CHROME_WEB_STORE_VERSION` update after marking a version uploaded.

## Required Agent Flow

1. Confirm release state

```bash
npm run release:status
```

2. If `Ready to upload` is `no` because the manifest version is not higher than the store upload version, bump it

```bash
npm run release:bump
```

3. Ensure production API URLs are set in source files

```bash
npm run build:prod
```

4. Build release ZIP

Use the current version from `manifest.json`:

```bash
npm run package
```

Output ZIP:
- `dist/autolister-ai-v<version>.zip`

5. Upload or hand off clearly

If the agent has Chrome Web Store access, upload the ZIP and submit it. Immediately after upload/submission:

```bash
npm run release:mark-uploaded
git add CHROME_WEB_STORE_VERSION
git commit -m "Mark Chrome Store upload <version>"
git push origin main
```

If the agent does not have Chrome Web Store access, do not run `release:mark-uploaded`. Leave the pending lock created by packaging and report the exact ZIP path and version to upload.

## GitHub Actions upload pipeline

Use `.github/workflows/chrome-web-store-release.yml` when the release should be packaged or uploaded from GitHub Actions.

One repository secret is required:

```bash
CHROME_WEB_STORE_SERVICE_ACCOUNT_JSON
```

Set it to the full JSON contents of the Google Cloud service account key. The workflow already knows:

```bash
CHROME_WEB_STORE_PUBLISHER_ID=616efd8f-d3cc-4a95-9b45-d48a0f4ad3e7
CHROME_WEB_STORE_EXTENSION_ID=mommklhpammnlojjobejddmidmdcalcl
```

Run it from GitHub:

1. Open the repository on GitHub
2. Go to Actions
3. Choose `Chrome Web Store Release`
4. Click `Run workflow`
5. Choose a mode:

- `package-only` builds and stores the ZIP as a workflow artifact.
- `upload` uploads the ZIP to Chrome Web Store but does not submit it for review.
- `upload-and-submit` uploads the ZIP and submits it for review.

When the user tells an agent "release the latest extension", "publish the latest extension to store", or "release/publish to Chrome Web Store", treat it as this command:

```bash
gh workflow run chrome-web-store-release.yml --ref main -f mode=upload-and-submit -f bump_patch=true
```

If the user only says "upload", use `mode=upload`.

For local API uploads, build a package first, then run:

```bash
CHROME_WEB_STORE_SERVICE_ACCOUNT_FILE=~/Downloads/auto-lister-ai-d9382c78ce44.json \
npm run release:chrome-web-store -- --zip dist/autolister-ai-v<version>.zip --mode upload
```

Use `--mode upload-and-submit` only when the package should also be submitted for review.

## Quick verification before upload

Check the archive includes key files:

```bash
unzip -l dist/autolister-ai-v<version>.zip
```

Confirm at least:
- `manifest.json`
- `content.js`
- `background.js`
- `popup.html`, `popup.js`
- `callback.html`, `callback.js`
- `lib/`, `icons/`, `_locales/`, `images/`

## Publish in Chrome Web Store

1. Open Chrome Web Store Developer Dashboard
2. Open your extension item
3. Go to the package upload section
4. Upload `dist/autolister-ai-v<version>.zip`
5. Save any listing metadata updates
6. Submit for review / publish rollout

## Notes

- Keep semantic versioning (`major.minor.patch`), for example `1.3.4`.
- `main` is the production frontend branch. Release-critical changes must be pushed to `main`, not only a feature branch.
