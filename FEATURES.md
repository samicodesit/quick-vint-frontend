# AutoLister AI - Chrome Extension Features

## Overview
AutoLister AI is a Chrome browser extension (Manifest V3) that provides AI-generated titles and descriptions for Vinted marketplace listings. It injects UI elements directly into Vinted's new listing page to generate compelling content from uploaded product images.

---

## Core Features

### 1. AI-Powered Listing Generation
- **One-click generation**: Click the "Generate" button to instantly create optimized titles and descriptions
- **Image analysis**: AI analyzes uploaded product images to extract key details
- **Smart compression**: Images are automatically compressed (max 1024px, JPEG 80% quality) before sending to reduce token usage
- **Auto-fill**: Generated content is automatically inserted into Vinted's title and description fields with proper event dispatch

### 2. Multi-Language Support
- **18 supported languages**: English, French, Dutch, Danish, Czech, Slovak, Swedish, German, Greek, Croatian, Finnish, Hungarian, Italian, Lithuanian, Polish, Portuguese, Romanian, Spanish
- **Language selection**: Dropdown in both popup and phone upload modal
- **Localized AI output**: Generated listings are created in the selected language

### 3. Phone Upload Feature
- **QR code generation**: Scan a QR code with your mobile device to upload photos directly
- **Real-time polling**: Extension polls for new images every 3 seconds
- **Auto-injection**: Photos from phone automatically appear in the Vinted file input
- **Session management**: Unique session IDs with 5-minute auto-cleanup

---

## Subscription Tiers (credit-based)

| Tier | Price | Credits/mo | Rollover Cap | Highlight Features |
|------|-------|-----------:|-------------:|--------------------|
| **Free** | €0 | 5 + 2/wk for 4 weeks (13 lifetime) | — | 5 phone uploads/month |
| **Closet Clear Pack** | €3.99 one-time | 15 (never expire) | — | All 15 work with phone upload |
| **Starter** | €5.99/mo | 80 | 240 | Unlimited phone upload |
| **Plus** | €9.99/mo | 200 | 600 | + Listing Preferences, Smart Re-Gen |
| **Pro** | €14.99/mo | 400 | 1,200 | + Tone Control, Emoji, Multi-language batch, completeness tips, priority support (24h) |
| **Business** | €24.99/mo | 1,000 | 3,000 | + Priority processing, dedicated direct support |

Each generation costs one credit. Multi-language batch generations cost one credit per language. Subscription credits burn first; pack credits last and never expire.

### Premium Features
- **Listing Preferences (Plus+)**: Predefined checkbox prefs that get appended to every generation prompt.
- **Smart Re-Gen (Plus+)**: Directional re-generation (Detailed / Casual / Short).
- **Tone Control (Pro+)**: Friendly, Professional, or Enthusiastic tone slider.
- **Emoji Support (Pro+)**: Toggle relevant emojis in the description.
- **Multi-Language Batch (Pro+)**: Generate the same listing across multiple Vinted domains in one click.
- **Priority Processing (Business)**: Priority server processing.

### Legacy Plans
Subscribers from before the credit-based pricing keep their original daily/monthly listing limits at their original price. Cancel + re-subscribe moves the user to the current plan list above.

---

## Authentication & Security

### Magic Link Authentication
- **Email-based**: No passwords required - sign in via secure magic link
- **Supabase integration**: Secure session management with automatic token refresh
- **Token refresh**: Background service worker refreshes tokens 5 minutes before expiry with exponential backoff retry

### Session Management
- **Secure storage**: Sessions stored in `chrome.storage.local`
- **Auto-logout**: Handles expired/invalid tokens gracefully
- **Cross-tab sync**: Auth state synchronized across all Vinted tabs

---

## User Interface

### Extension Popup
- **Authentication view**: Email input for magic link
- **Dashboard view**: Shows current plan, usage statistics, and renewal date
- **Settings view**: Tone selection, emoji toggle, language dropdown
- **Progress bars**: Visual indicators for daily and monthly usage

### Injected UI on Vinted
- **Generate button**: Appears next to title input with magic wand icon
- **Phone button**: Quick access to phone upload feature
- **Toast notifications**: Non-intrusive success/error messages with close buttons
- **Modal dialog**: QR code display for phone uploads with language selector

### Auth Callback Page
- **Localized welcome**: Auto-detected based on timezone (FR, DE, ES, IT, NL, default EN)
- **Language toggle**: Switch between detected language and English
- **Plan comparison**: Embedded pricing cards for upgrades
- **Subscriber recognition**: Customizes UI for existing paid users

---

## Technical Features

### Content Script Capabilities
- **DOM injection**: Injects buttons near Vinted's title input field
- **MutationObserver**: Waits for dynamic page elements to load
- **Image compression**: Canvas-based resizing and JPEG compression
- **File injection**: Programmatically adds phone-uploaded files to Vinted's file input via DataTransfer API

### Background Service Worker
- **Proxy fetch**: Handles cross-origin requests for image blobs
- **Session persistence**: Maintains auth state across browser sessions
- **Token lifecycle**: Automatic refresh and expiry handling
- **API communication**: Secure backend communication with auth headers

### Rate Limiting & Error Handling
- **Usage tracking**: Real-time daily/monthly call counts
- **429 handling**: Graceful degradation with upgrade prompts
- **Network resilience**: Retry logic for failed requests
- **Toast errors**: User-friendly error messages with upgrade links

---

## Supported Vinted Domains

The extension works across all Vinted regional domains:
- Austria (.at), Belgium (.be), Czech Republic (.cz), Germany (.de)
- Denmark (.dk), Spain (.es), Finland (.fi), France (.fr)
- Greece (.gr), Croatia (.hr), Hungary (.hu), Ireland (.ie)
- Italy (.it), Lithuania (.lt), Luxembourg (.lu), Netherlands (.nl)
- Portugal (.pt), Romania (.ro), Poland (.pl), Sweden (.se)
- Slovakia (.sk), UK (.co.uk), International (.com, .net)

---

## Backend Integration

### API Endpoints
- `POST /api/generate` - Generate listing from images
- `POST /api/auth/magic-link` - Request authentication email
- `POST /api/stripe/create-checkout` - Create payment session
- `POST /api/stripe/create-portal` - Access billing portal
- `GET/POST /api/phone-upload` - Phone upload polling endpoint

### External Services
- **Supabase**: Authentication and user profile storage
- **Stripe**: Subscription management and billing
- **QR Server**: QR code generation for phone uploads
- **Vercel**: Hosting for backend API and static pages

---

## Chrome Web Store Localization

The extension supports store listing localization:
- **English** (default)
- **French** (fr)
- **German** (de)
- **Czech store locale** (`_locales/cs/`; product output language uses `cz`)
- **Italian** (it)

Store listing title and description are localized via `_locales/messages.json` files.

---

## Permissions Required

- **storage**: Local session and settings storage
- **host_permissions**: Access to Vinted domains and backend API

---

## Browser Compatibility

- **Chrome**: Full support (Manifest V3)
- **Manifest version**: 3
- **Minimum Chrome version**: 88 (for full Manifest V3 support)

---

## Architecture Summary

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

---

## Version History

- **1.2.2** - Current: Chrome Web Store localization support
- **1.2.1** - Previous stable

---

*Generated from codebase analysis*
