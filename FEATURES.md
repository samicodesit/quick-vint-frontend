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

## Subscription Tiers

| Tier         | Daily Limit  | Monthly Limit | Features                           |
| ------------ | ------------ | ------------- | ---------------------------------- |
| **Free**     | No daily cap | 4 (lifetime)  | Basic generation, standard tone    |
| **Starter**  | 5            | 75            | All basic features                 |
| **Pro**      | 15           | 300           | + Tone selection, emoji support    |
| **Business** | 50           | 1000          | + Highest limits, priority support |

### Premium Features (Pro/Business)

- **Tone selection**: Choose between Standard, Funny, or Professional writing styles
- **Emoji toggle**: Enable/disable emoji usage in generated descriptions

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
- **Czech** (cs)
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

_Generated from codebase analysis_
