# Toolbar startup, 2026-11-02

Local draft, shared Chrome/Firefox code. No store upload or production frontend
deployment. The user-provided real Firefox screenshot confirms the existing
signed-in controls and Photos placement; new loader screenshots are local fixtures.

## Cause and change

The model client originally fetched settings on its initial tick, then waited for
the next three-second interval before mounting its control. The fix mounts the
final control with disabled buttons and aria-busy while settings load, then
resolves it in the same request completion. Ownership/language reads run in
parallel. A toolbar-ready event handles late host DOM without waiting for polling.
Existing polling remains for host recovery. First injection is attempted immediately.

The placeholder uses the existing model label, dimensions and toggle, with a
subtle thumbnail skeleton. Reduced motion disables its animation. Generate and
Writing style remain usable while the optional model state is pending. Feature
disabled (404) removes it; transport errors resolve busy state, show the existing
translated error and leave core tools usable. Sign-out removes stale controls.

## Controlled native Chromium measurements

Unmodified Chrome release 9932410 versus the startup patch with the coordinated
tour implementation. Actual MV3 worker, storage, content scripts and interactions.
Same local host-contract fixture and fixed 300 ms model API delay. Cold uses a
fresh browser/profile; warm reloads the same profile. Each baseline median has
three samples; fixed cold has three normal samples, fixed warm four. A separately
held cold response is excluded from model-latency medians and used for screenshots.

| Measurement | Before cold | After cold | Before warm | After warm |
| --- | ---: | ---: | ---: | ---: |
| Core controls visible/enabled | 108 ms | 148 ms | 44 ms | 45 ms |
| Model visible (loading or ready) | 3073 ms | 157 ms | 3033 ms | 57 ms |
| Model button enabled | 3073 ms | 465 ms | 3033 ms | 363 ms |
| Model response to enabled | 2641 ms | 5 ms | 2669 ms | 4 ms |
| First successful Writing style open | 188 ms | 217 ms | 105 ms | 124 ms |
| First successful model form open | 3965 ms | 1378 ms | 3856 ms | 1259 ms |

Core controls were already fast on this fixture; this repeat measured about
40 ms slower cold and essentially unchanged warm, so no core speedup is claimed.
The improvement removes the artificial model wait and
reserves its place during actual network latency. These are local controlled
timings, not guarantees about live Vinted or production response times. Raw
measurements, including actual Help/model interactions, are in `timings.json`.
Reproduce with `node scripts/audit-toolbar-startup.mjs` from this source checkout.

## Verification

- Both new regression cases failed against 1.4.30 before the change.
- Four native MV3 startup regressions pass: held response and usable core tools,
  immediate ready response, 503/404 resolution, and sign-out during pending data.
- Review added three regressions, all confirmed failing before the follow-up:
  an auth change supersedes a delayed initial owner read, pending/unavailable
  model controls do not emit exposure, and initial insertion announces readiness.
- Combined targeted toolbar, tour, telemetry and model checks: 30 passed.
- A final held-PATCH regression covers preserving the model toggle's busy state
  and recovery error across toolbar refreshes. The eight startup tests pass.
- Installed Firefox mock smoke passes: auth handoff, upload/compression, generation,
  packaged fonts and model setup. This does not automate the owner's normal
  Firefox session or claim production authenticated generation.
- Signed-out gating and tour behavior were coordinated separately and excluded
  from the startup commits. The consolidated full deterministic gate is recorded
  below.

Review loading/ready screenshots at desktop and narrow widths. The viewport is
desktop Chromium, not a physical Android test. Product UI text is reused; no
redundant helper copy was added. No live generation, upload or listing save ran.

## Consolidated acceptance

The shared startup patch is integrated with the automatic-tour and signed-out
control changes in the frontend main worktree. The complete configured gate
passed on 2026-11-02: 168 unit tests, 403 browser tests, 13 configured skips,
followed by a successful production build. Browser execution used the configured
single worker and AUTOLISTER_API_PATH pointed to current API main (2ef1b9c).
The default sibling link resolves to an older Orion checkout and must not be
used for this coordinated gate. An earlier run with that old fixture and four
workers was rejected as acceptance evidence; all 11 affected phone/focus checks
passed under the corrected setup before the complete successful run.

Automatic guidance now opens once without an invitation row or initial focus
and scrolling changes. It preserves existing dismissal flags, waits out competing
dialogs, avoids interrupting typing, allows immediate Help replay and dismisses
on account/route changes. A short, account-matched background claim prevents
simultaneous automatic launches across tabs. Native regressions reproduced and
verified the sign-in-return, passive Escape, navigation and claim edge cases.
Loading optional model data is excluded as a tour target.

Writing style and Help remain hidden while signed out and return after sign-in.
The sign-in copy and popup were preserved. The pre-existing unrelated
lib/user-model-ui.js edit was left untouched. No publishing or deployment ran.
