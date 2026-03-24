# Copilot Instructions — quick-vint (Chrome Extension)

## Cross-Repo Awareness

This Chrome extension (`quick-vint`) works together with the backend API (`quick-vint-api`). **When making changes, always cross-check the other repo** to ensure consistency:

- **Tier features** (emojis, tone, limits) must be enforced server-side in `quick-vint-api`. The extension provides UI gating but the backend is the source of truth.
- **Message types** sent via `chrome.runtime.sendMessage` must match handlers in `background.js`.
- **API request/response shapes** (e.g., `/api/generate` body fields) must stay in sync between `content.js` and `quick-vint-api/api/generate.ts`.
- **Storage keys** (`useEmojis`, `tone`, `selectedLanguage`, etc.) are shared between `popup.js`, `content.js`, and `background.js`.

## Project Context

- Chrome Extension (Manifest V3) for Vinted marketplace listings
- `content.js` is the main content script injected into Vinted pages
- `background.js` is the service worker handling auth and proxy fetches
- `popup.js` manages the extension popup UI (settings, auth, plan info)
- Build: `npm run build` (terser minification of content.js)
- No test suite or linting configured

## Subscription Tiers

| Feature            | Free          | Starter | Pro | Business |
| ------------------ | ------------- | ------- | --- | -------- |
| Basic generation   | ✓             | ✓       | ✓   | ✓        |
| Tone selection     | ✗             | ✗       | ✓   | ✓        |
| Emoji toggle       | ✗             | ✗       | ✓   | ✓        |
| Daily limit        | —             | 5       | 15  | 50       |
| Monthly limit      | —             | 75      | 300 | 1000     |
| Lifetime limit     | 4 (one-time)  | —       | —   | —        |

**Important:** Client-side tier checks are for UX only. All feature gating must be enforced server-side.
