# General Real-Browser Testing Design

**Date:** 2026-08-03

## Goal

Provide one reliable way for agents and the daily canary to run the current
frontend worktree in Chrome for Testing against real Vinted pages. The runner
must be headless by default, must never touch normal Chrome, and must leave
clear machine-readable evidence.

This replaces duplicated browser bootstrapping. It does not replace the local
Playwright suite, automate CAPTCHA, or make irreversible changes on Vinted.
The local suite remains the default. Live checks run only on explicit user
request or when current external Vinted DOM, authentication, or production
integration is necessary evidence that fixtures cannot provide.

## Approach

Keep `scripts/run-dom-canary.mjs` as the shared browser runner and generalize it
just enough to select a named check. Do not add a framework or dependency.

Each check owns only its page-specific actions and assertions. The shared
runner owns:

- Chrome for Testing discovery and launch;
- loading a clean copy of the current worktree as the unpacked extension;
- profile selection;
- headless/headed mode;
- optional AutoLister session injection;
- timeouts, screenshots, JSON diagnostics, cleanup, and exit codes;
- optional posting of the daily canary result.

Initially support two named checks:

1. `listing-create`: open the authenticated Vinted create-listing page and
   verify the title, description, photo input, and AutoLister controls. This is
   the daily selector canary.
2. `wardrobe-rewrite`: reuse the current hybrid wardrobe test: real public
   wardrobe/item/image plus the existing protected edit-page fixture and real
   AutoLister production generation. It must continue to test Apply, Undo, and
   Reject without saving.

The check selection can be a plain map of names to async functions. A plugin
interface, class hierarchy, or separate package is unnecessary.

## Browser Profiles and Authentication

The runner has two explicit profile modes:

- `disposable`: a fresh temporary profile, removed after the run. Use for
  public Vinted pages and hybrid checks. It cannot provide authenticated Vinted
  access.
- `canary`: a dedicated persistent Chrome for Testing profile owned only by
  AutoLister tests. Use for authenticated Vinted checks. It must never point at
  Google Chrome's normal user-data directory and must never stop normal Chrome.

The AutoLister application session is separate from Vinted authentication. A
check that needs it reads the existing mode-0600 session file created by
`npm run live:session` and injects it before loading the extension UI. Tokens
must not appear in logs, screenshots, git, or result payloads.

Vinted CAPTCHA or login expiry is reported as `auth_required`. The runner does
not bypass CAPTCHA. A human may perform one-time login or reauthentication in
the dedicated canary profile using an explicit setup command. This is the only
headed mode; ordinary test runs remain headless.

## Commands

Expose one general command with a named check:

```bash
npm run test:live -- listing-create
npm run test:live -- wardrobe-rewrite
```

Keep `npm run test:live:wardrobe` as a compatibility alias. Provide a setup
command for the dedicated canary profile:

```bash
npm run test:live:setup
```

The setup command opens Chrome for Testing only. It never opens or controls the
user's normal Chrome.

## Daily Canary

The Windows scheduled task runs the same `listing-create` command against the
dedicated canary profile. The task waits for the check to finish and returns
the check's exit code. It no longer launches a browser and immediately reports
success. Posting is opt-in for the scheduled task; manual live runs never send
canary alerts.

The check posts one result to `/api/dom-canary`:

- `passed`: authenticated page loaded and all required selectors exist;
- `auth_required`: the dedicated Vinted session needs manual renewal;
- `failed`: selector, extension injection, browser, timeout, or posting error.

The existing API payload remains compatible. Additional evidence belongs under
`result`; secrets never do.

## Worktree Isolation

Before launch, the Windows wrapper copies the current worktree to a temporary
extension directory while excluding `.git`, `node_modules`, test output, and
secret files. This prevents Chrome from loading stale store-extension code and
ensures the test covers the exact local changes under review.

The copy and disposable profile are deleted after the process exits. The
dedicated canary profile is retained by design.

## Evidence and Safety

Every run writes under ignored `tmp/real-browser/<check>/`:

- `diagnostics.json` with check name, status, reason, URL/path, extension
  version, assertion results, and timestamps;
- screenshots on failure and at meaningful successful checkpoints;
- a concise terminal summary and a nonzero exit code for failure.

No check clicks Vinted save, submit, buy, delete, publish, or message controls
unless a future command explicitly declares that destructive boundary and the
user approves it. The initial checks never do.

## Migration

- Reuse the browser/assertion logic in `scripts/run-dom-canary.mjs`.
- Move the reusable Chrome-for-Testing, worktree-copy, temp-profile, and cleanup
  logic from `scripts/run-live-wardrobe-rewrite.ps1` into one general wrapper.
- Keep the wardrobe-specific actions from
  `scripts/run-live-wardrobe-rewrite.mjs`, called by the named check.
- Replace the generated legacy scheduled runner in
  `scripts/install-dom-canary-task.ps1` with a call to the shared command and a
  dedicated canary profile default.
- Update the live-testing docs so future agents start from one index and choose
  a check by name.

## Verification

Add the smallest tests that lock down:

- check-name validation and default configuration;
- disposable versus persistent profile selection;
- `auth_required` classification;
- scheduled-task command construction and exit-code propagation;
- the existing canary payload contract.

Then run the focused tests, the existing full test suite, the production build,
`wardrobe-rewrite`, and `listing-create`. The authenticated listing check is
allowed to return `auth_required`; that proves the runner works but requires a
one-time dedicated-profile login before selector stability can be declared.
