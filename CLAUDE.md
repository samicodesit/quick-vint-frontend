# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AutoLister AI is a Chrome browser extension (Manifest V3) that provides AI-generated titles and descriptions for Vinted marketplace listings. It injects UI elements into Vinted's new listing page to generate content from uploaded images.

## Build Commands

```bash
# Install dependencies
npm install

# Build minified content script for production
npm run build
# Runs: terser content.js -o content.min.js --compress --mangle

# Prepare (runs build automatically on npm install)
npm run prepare
```

Note: There is no test suite or linting configured in this project.

## Development Workflow

This is a Chrome Extension that must be loaded manually for development:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the project directory
5. The extension will be loaded and active on Vinted domains
6. After making code changes, click the refresh icon on the extension card

**Key development notes:**

- `content.js` is the main content script injected into Vinted pages
- `background.js` is the service worker (persists only while active, wakes on events)
- Changes to background.js require extension reload
- Changes to content.js require page refresh after extension reload

## Architecture

### Component Structure

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   popup.html    │────▶│  background.js   │◀────│   callback.html │
│   (popup.js)    │     │ (service worker) │     │  (callback.js)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │
         │                       │ chrome.runtime.sendMessage
         ▼                       ▼
┌─────────────────┐     ┌──────────────────┐
│  Vinted Page    │◀────│    content.js    │
│  (DOM injection)│     │ (content script) │
└─────────────────┘     └──────────────────┘
```

### Key Components

**content.js** (Content Script)

- Injected into all Vinted new listing pages (matches `*://*.vinted.*/items/new*`)
- Creates "Generate" and "Phone" buttons near the title input
- Handles image compression using Canvas API before sending to backend
- Communicates with backend API at `https://quick-vint.vercel.app/api/generate`
- Polls for phone-uploaded images via `PROXY_FETCH` messages to background

**background.js** (Service Worker)

- Manages Supabase authentication session and token refresh
- Stores session in `chrome.storage.local` under key `supabaseSession`
- Handles `PROXY_FETCH` messages to proxy cross-origin requests (for image blobs)
- Exposes `GET_ACCESS_TOKEN`, `GET_USER_PROFILE`, `SIGN_OUT` message handlers
- Auto-refreshes tokens 5 minutes before expiry with exponential backoff retry

**popup.js** (Extension Popup)

- UI for authentication (magic link), settings, and plan management
- Supports language selection (stored in `chrome.storage.local.selectedLanguage`)
- Settings include tone (standard/funny/professional) and emoji toggle (Pro/Business only)
- Integrates with Stripe for subscription management

**callback.js** (Auth Callback)

- Handles Supabase magic link authentication
- Localized UI (FR, DE, ES, IT, NL, default EN) based on timezone/language detection
- Stores session and signals background via `AUTH_UPDATED` message

### Communication Patterns

**Message types sent to background.js:**

```javascript
// Get valid access token (auto-refreshes if needed)
{ type: "GET_ACCESS_TOKEN" } // returns { access_token, expires_at }

// Get user profile and session
{ type: "GET_USER_PROFILE" } // returns { user, profile }

// Get daily API call count
{ type: "GET_USER_DAY_COUNT" } // returns { daily: number }

// Sign out
{ type: "SIGN_OUT" } // returns { ok: boolean, error?: string }

// Proxy fetch for cross-origin requests (images, API calls)
{ type: "PROXY_FETCH", url: string, options: object, isBlob?: boolean }
// returns { ok: boolean, status: number, data: any, error?: string }

// Auth state updated (from callback)
{ type: "AUTH_UPDATED" } // returns { ok: boolean }
```

**Storage keys in chrome.storage.local:**

- `supabaseSession` - Full Supabase session object
- `userProfile` - User's subscription tier, usage counts
- `selectedLanguage` - Preferred language code (default: "en")
- `tone` - Writing tone preference ("standard", "funny", "professional")
- `useEmojis` - Boolean for emoji usage in generated content

### External Dependencies

- **Supabase** (`lib/supabase.js`): Authentication and database
  - URL: `https://jqloiovdwjaornnfvmyu.supabase.co`
  - Handles magic link auth, session management

- **Backend API** (`https://quick-vint.vercel.app`):
  - `POST /api/generate` - Generate listing from images
  - `POST /api/auth/magic-link` - Request magic link email
  - `POST /api/stripe/create-checkout` - Create Stripe checkout session
  - `POST /api/stripe/create-portal` - Create Stripe customer portal
  - `GET/POST /api/phone-upload?sessionId=xxx` - Phone upload polling endpoint

- **QR Server** (`api.qrserver.com`): QR code generation for phone upload feature

### Subscription Tiers

| Tier     | Daily | Monthly | Features                 |
| -------- | ----- | ------- | ------------------------ |
| free     | 3     | 5       | Basic generation         |
| starter  | 5     | 75      | Standard generation      |
| pro      | 15    | 300     | + Tone selection, emojis |
| business | 50    | 1000    | + Highest limits         |

Rate limiting is enforced server-side; the extension displays usage progress bars in the popup.

### Image Processing Flow

1. User uploads images to Vinted or via phone upload modal
2. On "Generate" click, `content.js` compresses images via Canvas API:
   - Max dimension: 1024px
   - JPEG quality: 0.8
   - Returns base64 data URLs
3. Compressed images sent to `/api/generate` with auth token
4. Response includes generated title and description
5. Content script fills Vinted's input fields and dispatches input events

### Phone Upload Feature

1. User clicks "Phone" button on listing page
2. Modal opens with QR code linking to `phone-upload.html?s=<sessionId>`
3. User scans QR with mobile device and uploads photos
4. `content.js` polls `/api/phone-upload?sessionId=xxx` every 3 seconds
5. New images downloaded via `PROXY_FETCH`, converted to File objects
6. Files injected into Vinted's file input via DataTransfer API
