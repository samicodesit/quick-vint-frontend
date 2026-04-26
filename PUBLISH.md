# Publish Runbook (Chrome Web Store)

This repo has two packaging scripts:

- `npm run package` -> runs `node build.js`
- `npm run package:bash` -> runs `./build.sh`

Use `npm run package:bash` for releases right now.

Why:
- `callback.js` references `images/onboard.png`
- `build.sh` includes `images/` in the ZIP
- `build.js` currently does not include `images/`

## Recommended flow

1. Install dependencies (if needed)

```bash
npm install
```

2. Ensure production API URLs are set in source files

```bash
npm run build:prod
```

3. Build release ZIP

- Keep current version from `manifest.json`:

```bash
npm run package:bash
```

- Or bump version while packaging:

```bash
npm run package:bash -- 1.3.4
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
