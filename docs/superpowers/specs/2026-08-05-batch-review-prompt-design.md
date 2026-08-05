# Batch review prompt

## Goal

Ask for an honest Chrome Web Store review after a successful batch without
interrupting batch generation or showing the request after a failed batch.

## Experience

- Queue the prompt only when the final generated listing succeeds.
- Show it in the final generated tab, where Chrome leaves the user.
- Present a polished AutoLister modal with a small `Batch complete` label,
  the title `Impressive, isn’t it?`, concise review copy, and one restrained
  stacked-listing illustration.
- Primary action: `Leave an honest review`, opening the public Chrome Web Store
  reviews page in a new tab.
- Secondary action: `Not now`.
- Close, backdrop click, and Escape behave like `Not now`.

## Persistence

- Store prompt state per signed-in user in `chrome.storage.local`.
- Opening the review page permanently suppresses future prompts.
- Any other dismissal suppresses the prompt for seven days.
- The admin component preview may bypass persistence so the state remains easy
  to inspect.

## Implementation shape

- Reuse the existing content-script modal, storage, and analytics patterns.
- Send a dedicated message to the final work tab after the batch `done` state;
  do not depend on the original batch modal being visible.
- Add one scenario to the existing admin content-components runtime.
- Add one focused runnable check for the final-tab message and suppression rule;
  no broader test pass is required for the preview stage.

## Accessibility and failure behavior

- Use an accessible modal dialog with labelled title, keyboard focus, Escape,
  visible focus states, and reduced-motion support.
- If storage cannot be read, do not repeatedly interrupt the user during the
  same page session.
- Opening the review URL must be a direct user action; failure leaves the modal
  available so the user can retry or dismiss it.
