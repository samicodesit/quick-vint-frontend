# Real Vinted Browser Evidence

This is the canonical runbook for agents that need proof against current Vinted.
Live checks are opt-in: ordinary `test` requests mean `npm test`, not Vinted.

## Pick the existing proof

| Need | Use | Boundary |
|---|---|---|
| Extension regression | `npm test` | deterministic fixtures |
| Current authenticated create-page selectors and injection | latest daily DOM-canary `log-detail` | real `https://www.vinted.nl/items/new` |
| Wardrobe/relisting plus production generation | `npm run test:live:wardrobe` | real public wardrobe/item/image; synthetic owner and edit fixture |

Do not create another listing-page browser runner. The daily Windows task already
owns authenticated Vinted access. Reuse its production result unless the user
explicitly asks to launch a fresh real-browser run.

## Authoritative daily canary

Windows Scheduled Task: `AutoLister DOM Canary`, scheduled for 16:30
Europe/Amsterdam. Its generated runner:

1. uses Chrome for Testing;
2. uses Google Chrome User Data `Profile 4`, which contains the working Vinted session;
3. copies the configured frontend checkout into its canary extension directory;
4. opens the real Vinted `/items/new` page headed;
5. lets the extension verify title, description, photo input, AutoLister tools,
   Generate, and Sign In controls;
6. posts the result to `/api/dom-canary`.

The task's `LastTaskResult = 0` only proves the runner launched. The authoritative
pass/fail and DOM details are the production `/api/dom-canary` `log-detail` body.

The task is the sole exception to the normal-profile rule. Agents must not trigger,
reinstall, reschedule, open, or close it unless the user explicitly asks. Never
automate Vinted CAPTCHA or save/submit a listing.

## Read the latest proof

First read `../quick-vint-api/docs/production-log-runbook.md`. Use its admin API
commands with network escalation, search for `dom-canary@autolister.app`, and fetch
`log-detail` for the newest `/api/dom-canary` row. List rows or alert emails alone
are not proof.

A current selector/injection pass requires all of these:

- `status === "passed"`
- `path === "/items/new"`
- `result.injected === true`
- `result.dom.title`, `description`, `fileInput`, `tools`, `generateButton`, and
  `signInButton` are all `true`

Also report `occurredAt`, `extensionVersion`, URL, and title text. A failed result
with `reason: "auth_required"` proves neither selector stability nor injection.

Last verified: the 2026-08-02 16:30 CEST daily run passed on the real authenticated
Vinted create page with extension `1.3.70` and every required DOM field present.

## Explicit fresh run

The user can authorize this by saying `Run a fresh real Vinted canary`. Then run:

```powershell
powershell.exe -NoProfile -Command "Start-ScheduledTask -TaskName 'AutoLister DOM Canary'"
```

This opens the same visible Chrome-for-Testing/Profile-4 flow used by the daily
task. Do not substitute another browser or profile. Record the start time, wait
for a newer `/api/dom-canary` row, fetch its `log-detail`, and apply every pass
criterion above. `LastTaskResult` is not the verdict.

This explicit command covers only the canary's existing real create-page
selector/injection assertions. It does not authorize unrelated live flows,
generation credits, CAPTCHA automation, or saving a Vinted listing.

## Wardrobe/relisting live check

Use `docs/live-wardrobe-rewrite-testing.md`. It is a separate opt-in hybrid test,
runs headlessly in a disposable Chrome-for-Testing profile, consumes one production
generation credit, and never saves a listing. It intentionally does not share the
daily task's authenticated profile or create-page flow.
