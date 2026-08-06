# Real Batch Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make real batch interruption and recovery logs unambiguous and make the persistent browser runner the canonical real workflow test.

**Architecture:** The background worker owns a stable batch ID and pause reason and includes them in every progress message. The content script adds those fields to existing analytics events and flushes terminal events with `keepalive` so logging does not delay the user. Documentation separates real workflow tests from mocked Playwright tests and the selector-only DOM canary.

**Tech Stack:** Chrome MV3 JavaScript, existing analytics endpoint, Node tests, Playwright, Markdown.

## Global Constraints

- Do not add dependencies.
- Do not add synchronous network waits to the user flow.
- Never automate CAPTCHA or click Vinted Save/Publish.
- Fresh test profiles use manual authentication; later runs reuse the dedicated persistent profile.

---

### Task 1: Batch lifecycle context

**Files:**
- Modify: `background.js`
- Modify: `content.js`
- Test: `test/background-wardrobe-rewrite.test.js`
- Test: `tests/e2e/extension.spec.js`

**Interfaces:**
- Consumes: existing `BATCH_PROGRESS`, `START_BATCH_GENERATION`, and recovery messages.
- Produces: `batchId`, `inputSource`, `reason`, `completedCount`, `total`, and `recoveryAgeMs` analytics context.

- [x] Add failing assertions that one batch ID survives checkpoint/restart/resume and that pause responses include an explicit reason.
- [x] Add the stable batch metadata once in background progress/recovery responses.
- [x] Include that metadata in start, pause, failure, recovery, resume, and done events.
- [x] Run `node --test test/background-wardrobe-rewrite.test.js` and the targeted Playwright batch tests.

### Task 2: Reliable terminal event delivery

**Files:**
- Modify: `content.js`
- Test: `tests/e2e/extension.spec.js`

**Interfaces:**
- Consumes: existing queued growth-event transport.
- Produces: non-blocking `keepalive` requests and immediate queue flushing for terminal batch states.

- [x] Add a failing assertion for `keepalive: true` and terminal flush behavior.
- [x] Reuse `flushGrowthEvents()` after terminal batch events without awaiting it.
- [x] Run the targeted Playwright analytics tests.

### Task 3: Canonical real test documentation and manual auth

**Files:**
- Modify: `scripts/run-live-batch-recovery.mjs`
- Modify: `scripts/run-live-batch-recovery.ps1`
- Modify: `docs/real-batch-recovery-testing.md`
- Modify: `docs/real-browser-testing.md`

**Interfaces:**
- Consumes: the persistent `%LOCALAPPDATA%\AutoListerRealBatchTest` profile.
- Produces: a blank-on-first-run, manually authenticated, reusable real workflow test.

- [x] Remove first-run copying of another Chrome profile and remove session-file injection.
- [x] Keep existing persistent profiles reusable; require manual extension/Vinted sign-in only when absent or expired.
- [x] Put the real batch runner first in the real-testing guide and label the DOM canary selector-only.
- [x] Run Node syntax checks and the real two-item mini-model recovery test.

### Task 4: Verify and commit

**Files:**
- Verify all files above.

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: pushed frontend commit and production log-detail proof.

- [x] Run the deterministic frontend suite relevant to batch recovery.
- [x] Run the persistent real recovery test and inspect full event details.
- [ ] Commit and push only after both deterministic and real checks pass.
