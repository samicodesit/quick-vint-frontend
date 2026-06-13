# Vinted DOM Canary

Vinted blocks automated browser sessions, so the daily check must run from a
normal Chrome profile with the AutoLister extension installed and signed in.

How it works:

- A real browser opens `https://www.vinted.nl/items/new`.
- The extension waits for the title and description fields.
- It writes temporary canary values, verifies they stick, and restores the
  original values immediately.
- A passing run sends one backend heartbeat per 24 hours.
- A failing run sends an immediate alert.
- A Vercel cron alerts if no passing heartbeat was seen recently.

Schedule this on a real machine that stays logged into Vinted:

```sh
15 8 * * * cd /home/mests/projects/quick-vint && scripts/open-vinted-canary.sh
```

Required production environment:

- `RESEND_API_KEY`
- `CRON_SECRET`

Optional production environment:

- `DOM_CANARY_ALERT_EMAIL`, defaults to `support@autolister.app`
- `DOM_CANARY_STALE_HOURS`, defaults to `30`
- `VINTED_NEW_ITEM_URL`, defaults to `https://www.vinted.nl/items/new` for the
  local runner script
