# AutoLister flow review, 16 October 2026

**40 numbered screenshots. Unreleased extension candidate.** Open a flow below, then tap any screenshot to zoom. Modal images are cropped for phone readability; each step also links the full browser viewport.

1. [Extension batch: upload, group, watch each new tab, review](batch.md) (13 steps)
2. [Extension single item: computer photos](single-computer.md) (5 steps)
3. [Extension single item: phone handoff](single-phone.md) (4 steps)
4. [Web app single item: setup, generate, edit, copy, reload, offline edit](web-single.md) (9 steps)
5. [Web app batch: group, generate, review and copy](web-batch.md) (9 steps)

## What these screenshots establish

These are screenshots of the running product UI, captured during explicit browser actions by the primary agent. The extension is loaded in real Chromium with its actual worker, content script, messaging, tabs and storage. The batch captures verify focus before the controlled generation response arrives. Start batch is still an explicit seller action. New listing tabs open automatically while they prepare. An unrelated active tab or editing a ready listing stops automatic focus changes.

The extension's surrounding marketplace form is a **simplified local fixture** with title, description, file input and photo elements. It is not Vinted's full layout, React application, upload service, category/brand/size/price controls or publish validation. Extension auth, temporary storage and AI responses are controlled. Phone-session readiness is controlled; these phone screenshots do not establish actual handset upload reliability. Do not scan the review QR codes.

The web app uses the actual local production build, its existing compact components and real browser image preparation, IndexedDB, editing and clipboard. Authentication and server storage/generation responses are controlled. The 390 px captures are Chromium, not native iPhone Safari or Orion certification. No web app product UI files were changed for this review.

The example photos and generated responses are fixture data. They demonstrate interaction and retention, not model quality or recognition accuracy. No live marketplace listing was created, no paid model was called and no customer data appears here.

## Acceptance status

This is an interaction review, **not permission to publish or a declaration that the full reliability work is finished**. Extension automatic network waiting/reconnection, worker interruption and the remaining full integration/manual release checks still require completion. A live Vinted single/batch acceptance journey for the candidate remains unverified. Current passing tests cannot establish recovery of a historical customer incident.

See [evidence and limits](evidence.md) for concrete findings, test results and the latest real Vinted selector evidence. The product changes remain local and unshipped. This GitHub upload contains the review material only.
