# Free Limit Offer Flow

This document is the source of truth for the on-page offer shown to free users after they use their free listings.

## Goals

- Let blocked free users continue without hiding the normal paywall path.
- Avoid interrupting sellers while they are actively filling a Vinted listing.
- Keep checkout intent clear: if the user clicks a plan, do not show another offer.
- Keep repeat exposure limited with local dismissed/shown cooldown state.

## Entry Points

### 1. Free-limit paywall close

Trigger:
- `/api/generate` or capacity checks return `free_lifetime_limit`.
- The extension shows the free-limit paywall.
- The user closes the paywall without clicking checkout.

Behavior:
- Wait 10 seconds.
- Show the LISTFASTER20 offer near the listing tools.
- This path is local and deterministic. It does not require the follow-up eligibility endpoint.
- It can show while a listing draft exists because it is a direct response to the user's blocked Generate action.

Cancel conditions:
- The user clicks any checkout option in the paywall.
- The offer was previously dismissed locally.
- The offer was shown recently.

Covered by:
- `tests/e2e/extension.spec.js` -> `shows the free-limit offer after closing the free-limit paywall`

### 2. Return-visit offer

Trigger:
- Authenticated listing tools become ready.
- The extension waits briefly, then asks `/api/user/limit-followup-offer`.
- The API confirms the user recently hit the free lifetime limit and is still eligible.

Behavior:
- Show the same LISTFASTER20 offer only when the current listing page is not in draft mode.
- If the user has a title, description, or uploaded photos, stay quiet.
- If the offer is pending and the page becomes visible/focused again, retry once through the normal prompt queue.

Cancel conditions:
- The user has a listing draft in progress.
- Another prompt/modal is already open.
- The offer was previously dismissed locally.
- The offer was shown recently.
- The server says the user is not eligible.

Covered by:
- `tests/e2e/extension.spec.js` -> `does not interrupt an in-progress listing with the return-visit limit offer`

## Offer Actions

- `View plans & use offer`: dismisses the local offer state and opens the pricing URL.
- `Maybe later`: dismisses the local offer state.
- `Share feedback for free listings`: dismisses the local offer state and opens the report modal.
- Coupon click copies `LISTFASTER20`.

## Edge Cases

- A user who reloads with a half-filled listing should not see the proactive return-visit offer.
- A user who just hit the limit and closes the paywall should see the rescue offer even if photos are already uploaded.
- A user who clicks checkout from the paywall should not see the rescue offer.
- A user who dismissed, opened, or used feedback should not be shown the same offer repeatedly.
- Checkout links must keep using the normal pricing page flow.
