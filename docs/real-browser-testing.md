# Real Vinted Browser Evidence

This is the canonical index for proof against current Vinted. Live checks are
opt-in: ordinary `test` requests mean `npm test`, not Vinted.

## Canonical real workflow test

For real user-flow behavior, use
[`real-batch-recovery-testing.md`](real-batch-recovery-testing.md). It runs the
actual unpacked extension on the real Vinted create page, calls the production
generation flow, kills the real MV3 service worker after checkpoint `1/2`, and
proves recovery to `2/2`. Its dedicated Chrome profile is manually authenticated
once and then preserved. The runner never copies cookies or auth sessions, never
automates CAPTCHA, and never clicks Save or Publish.

The daily DOM canary remains authoritative for current selector/injection health,
but it is not a real batch, generation, interruption, or recovery test.

## Pick the existing proof

| Need | Use | Boundary |
|---|---|---|
| Real batch upload, generation, worker interruption, and resume | `scripts/run-live-batch-recovery.ps1` | real Vinted, production API, persistent manual auth, two mini-model test credits |
| Extension regression | `npm test` | deterministic fixtures |
| Current authenticated create-page selectors and injection | latest daily DOM-canary `log-detail` | real `https://www.vinted.nl/items/new` |
| Wardrobe/relisting plus production generation | `npm run test:live:wardrobe` | real public wardrobe/item/image; synthetic owner and edit fixture |

Do not create a competing batch runner. Extend the persistent real batch runner
when another real create-page workflow or failure mode needs proof. Reuse the
daily canary only when selector/injection evidence is sufficient.

## Authoritative daily canary

Windows Scheduled Task: `AutoLister DOM Canary`. Task Scheduler holds its daily
schedule; reinstalling preserves the existing trigger. Its launcher:

1. uses Chrome for Testing;
2. preserves its dedicated, manually authenticated canary profile;
3. loads an installed, verified release ZIP rather than copying a development checkout;
4. opens the real Vinted `/items/new` page headed;
5. runs `scripts/run-dom-canary.mjs` to verify title, description, photo input, AutoLister tools,
   Generate, Sign In, Phone, and both language controls;
6. closes the browser and posts one result from the host to `/api/dom-canary`.

The canonical Node runner owns both selector checks and report delivery, including
browser-launch failures. Failures return a nonzero exit code. The latest bounded
result and launcher output live in `%LOCALAPPDATA%\AutoListerDomCanary\last-result.json`
and `last-run.log`. The authoritative retained pass/fail and DOM details remain
the production `/api/dom-canary` `log-detail` body.

The profile is never seeded from normal Chrome. The runner does not create an
account, supply Vinted credentials, accept terms, or solve challenges. A redirect
to `/terms_and_conditions` reports `terms_required`; login redirects report
`auth_required`. These are account gates, not selector-drift verdicts. Do not
accept a legal agreement without the user's specific review/authorization.

To update the installed checker, use `scripts/install-dom-canary-task.ps1` with
`-ExtensionZip` pointing to the verified published package and the existing
canary root. It installs only that package and the canonical runner. Do not
point the task at a dirty development checkout or create a second task/profile.
The installer preserves the scheduled time and keeps one task with overlapping
runs ignored. Existing Chrome for Testing must be available. Windows script
signing/execution controls still apply; do not change system policy.

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
- `result.dom.title`, `description`, `fileInput`, `tools`, `generateButton`,
  `signInButton`, `phoneButton`, `titleLanguage`, and `descriptionLanguage` are
  all `true`

Also report `occurredAt`, `extensionVersion`, URL, and title text. A failed result
with `reason: "auth_required"` proves neither selector stability nor injection.

Recheck actual extension version and every DOM flag on each fresh result.
Historical passes do not certify the current Vinted page or installed package.

Missing language controls include bounded field structure in the result:
three ancestor levels, four children per level, and associated/nearby label
attributes. Values, field text, HTML and photos are excluded. This distinguishes
host label-layout changes from a missing input without collecting a page dump.

## Explicit fresh run

The user can authorize this by saying `Run a fresh real Vinted canary`. Then run:

```powershell
powershell.exe -NoProfile -Command "Start-ScheduledTask -TaskName 'AutoLister DOM Canary'"
```

This opens the same visible Chrome-for-Testing flow used by the daily
task. Do not substitute another browser or profile. Record the start time, wait
for a newer `/api/dom-canary` row, fetch its `log-detail`, and apply every pass
criterion above. `LastTaskResult` is not the verdict.

This explicit command covers only the canary's real create-page
selector/injection assertions. It does not authorize unrelated live flows,
generation credits, CAPTCHA automation, or saving a Vinted listing.

## Wardrobe/relisting live check

Use `docs/live-wardrobe-rewrite-testing.md`. It is a separate opt-in hybrid test,
runs headlessly in a disposable Chrome-for-Testing profile, consumes one production
generation credit, and never saves a listing. It intentionally does not share the
daily task's authenticated profile or create-page flow.
