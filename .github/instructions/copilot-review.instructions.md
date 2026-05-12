---
applyTo: "**"
---

# Repo review context

- Treat `.claude/skills/pricing-overhaul/SKILL.md` as the source of truth for pricing, tier gating, and legacy-user behavior.
- Legacy users remain on their original feature set unless the spec explicitly says otherwise. Do not assume new Plus-tier features should be unlocked for legacy plans.
- Distinguish between product output language codes and Chrome Web Store locale codes:
  - Product/UI/output language uses `cz` for Czech in this repo.
  - Chrome extension localization folders use the platform-required `_locales/cs/` code.
- Do not flag the `cz` product code as inconsistent when the code is dealing with output language selection, Vinted language options, or generation requests.
- It is valid to add a small compatibility fallback for previously stored `cs` values, but new product-facing language state should use `cz`.
