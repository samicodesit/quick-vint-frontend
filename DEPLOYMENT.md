# AutoLister AI — Chrome Extension Deployment Guide

## Prerequisites

- **Node.js** (v16+) and **npm**
- Google Chrome browser
- Chrome Web Store developer account (for publishing)

## Project Structure (Key Files)

```
manifest.json        — Extension manifest (version, permissions, content scripts)
content.js           — Content script injected into all Vinted pages
background.js        — Service worker (auth, proxy fetches)
popup.html / popup.js — Extension popup UI
callback.html / callback.js — OAuth callback page
lib/localization.js  — Shared localization strings + language detection
lib/supabase.js      — Supabase client library
scripts/set-env.js   — Pre-build URL substitution
build.js             — Release packaging script
_locales/            — Chrome i18n messages (extension name/description)
icons/               — Extension icons (16, 32, 48, 128px)
```

## Build Commands

### Install dependencies

```bash
npm install
```

### Development build (local API)

```bash
npm run build:local
```

This runs two steps:

1. **`node scripts/set-env.js`** — Substitutes the API base URL (`http://localhost:5000`) in these files:
   - `content.js` — API endpoint for generation
   - `popup.js` — API endpoint for auth, Stripe, tier-config
   - `callback.js` / `callback.html` — Auth callback redirect
   - `manifest.json` — Host permissions

2. **`terser content.js -o content.min.js`** — Minifies content script

### Production build

```bash
npm run build:prod
```

Same as above but substitutes `https://quick-vint.vercel.app` as the API URL.

### Available build scripts

| Script | URL used | When to use |
|---|---|---|
| `npm run build:local` | `http://localhost:5000` | Local development |
| `npm run build:prod` | `https://quick-vint.vercel.app` | Staging/manual testing against prod |
| `npm run build` | Default from `set-env.js` (localhost fallback) | CI / when `API_BASE_URL` env var is set |
| `npm run package` | Production (build.js forces prod URL) | Release packaging |
| `npm run package:bash` | Same via shell script | Alternative release packaging |

### Release packaging

```bash
node build.js 1.3.4
```

This:
1. Updates `manifest.json` version to `1.3.4`
2. Runs `set-env.js` with production URL to ensure all URLs are correct
3. Copies all release files to a temp directory (see INCLUDE_LIST in build.js)
4. Creates `dist/autolister-ai-v1.3.4.zip` ready for Chrome Web Store upload

**Files included in the release zip:**
- manifest.json, content.js, background.js
- popup.html, popup.js
- callback.html, callback.js
- preview.html
- lib/ (localization.js, supabase.js)
- icons/
- _locales/

## Local Development

### 1. Load the extension in Chrome

1. Navigate to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `quick-vint/` project directory
5. The extension icon appears in the toolbar

### 2. Start the backend API locally

In the `quick-vint-api/` directory:
```bash
pnpm dev
```
This starts the API at `http://localhost:5000`.

### 3. Run the build to point at localhost

```bash
npm run build:local
```

### 4. Reload after changes

| What changed       | What to do                              |
|--------------------|-----------------------------------------|
| `content.js`       | `npm run build:local`, then refresh the Vinted tab |
| `popup.html/js`    | `npm run build:local`, click refresh on `chrome://extensions/`, re-open popup |
| `background.js`    | Click refresh on `chrome://extensions/` |
| `manifest.json`    | Click refresh on `chrome://extensions/` |
| `lib/localization.js` | `npm run build:local`, refresh Vinted tab + re-open popup |

**Tip:** `content.js` changes require both a build (for minification) AND a page refresh on Vinted.

## Publishing to Chrome Web Store

1. Bump version and create the zip:
   ```bash
   node build.js 1.3.4
   # or equivalently:
   npm run package
   ```

2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)

3. Select the AutoLister AI extension

4. Click **Package** → **Upload new package**

5. Upload `dist/autolister-ai-v1.3.4.zip`

6. Update store listing if needed (descriptions in `store-descriptions/`)

7. Submit for review

## Environment Variables

| Variable        | Purpose                          | Default                         |
|----------------|----------------------------------|---------------------------------|
| `API_BASE_URL` | Backend API endpoint URL         | `http://localhost:5000`         |

## Localization

The extension supports 7 UI languages: English, French, German, Spanish, Italian, Dutch, Polish.

- **UI strings**: Defined in `lib/localization.js` → `UI_STRINGS` object
- **Language detection**: Auto-detects from timezone → browser language → defaults to English
- **User override**: Settings → "Display language" picker persisted as `uiLanguage` in chrome.storage
- **Content language**: Separate dropdown ("Generated content language") controls what language the AI writes in, stored as `selectedLanguage`

To add a new UI language:
1. Add a new entry to `UI_STRINGS` in `lib/localization.js`
2. Add the language to `UI_LANGUAGES` array in the same file
3. Optionally add the language code to `detectUILanguageCode()` timezone/language maps
