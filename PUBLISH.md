# Publish Runbook (Chrome Web Store)

This repo has two packaging scripts:

- `npm run package` -> runs `node build.js`
- `npm run package:bash` -> runs `./build.sh`

Both scripts include the files needed by the Chrome extension, including `images/`.

## Version rule

The source of truth for the currently published Chrome Web Store version is:

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

After Chrome Web Store accepts and publishes the upload, mark that version as published:

```bash
npm run release:mark-published
```

Commit and push the `CHROME_WEB_STORE_VERSION` update after marking it published.

## Recommended flow

1. Install dependencies (if needed)

```bash
npm install
```

2. Check and bump the upload version

```bash
npm run release:status
npm run release:bump
```

3. Ensure production API URLs are set in source files

```bash
npm run build:prod
```

4. Build release ZIP

Use the current version from `manifest.json`:

```bash
npm run package:bash
```

Output ZIP:
- `dist/autolister-ai-v<version>.zip`

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

- `build.sh` edits `manifest.json` when a version argument is provided.
- Keep semantic versioning (`major.minor.patch`), for example `1.3.4`.
- If you switch to `npm run package` later, first update `build.js` to include `images/`.
