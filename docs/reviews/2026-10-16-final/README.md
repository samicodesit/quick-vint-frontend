# AutoLister flow review

Current local candidate, captured 16-17 October 2026 (Amsterdam time). **Nothing here is production delivery proof.**

The primary agent operated and inspected the extension batch, single computer, single phone and separate web app flows. AI, auth and marketplace services were isolated. The phone transport section is from the real HTTP fault-test run and was visually inspected separately. No paid generation or live marketplace actions were used.

## Choose a flow

- [Extension batch](#extension-batch)
- [Single computer item](#single-computer-item)
- [Single phone item](#single-phone-item)
- [Exceptional recovery](#exceptional-recovery)
- [Web app batch](#web-app-batch)
- [Web app single item](#web-app-single-item)
- [Phone transport](#phone-transport)
- [Verification and limits](acceptance.md)

The marketplace page is a create-form fixture with the selectors used by the extension, not the full live Vinted React application. Native Orion/iOS is untested. Some country flag images are unavailable because external hosts are blocked. The extension flows use the pictured sweater and outfit files.

The extension opens each new tab while preparing. It stops following automatically when the seller edits, pauses following or moves elsewhere. The separate web app stays in place and offers Review as soon as each draft is ready.

## Extension batch

### 1. Compact entry

Healthy. Actual loaded extension; the existing compact entry remains.

![Compact entry](batch-01.png)

### 2. Choose single or batch

Healthy. Sellers choose single or multiple listings.

![Choose single or batch](batch-02-detail.png)

[Full viewport](batch-02.png)

### 3. Photos ready to group

Healthy. Four actual local image files. No permanent scrollbar in this viewport.

![Photos ready to group](batch-03-detail.png)

[Full viewport](batch-03.png)

### 4. Group an item

Healthy. Select the photos belonging to one item.

![Group an item](batch-04-detail.png)

[Full viewport](batch-04.png)

### 5. Ready for one Start

Healthy. Two grouped items; the seller explicitly starts generation once.

![Ready for one Start](batch-05-detail.png)

[Full viewport](batch-05.png)

### 6. First tab opens while preparing

Healthy. Active immediately, before controlled generation completes. Fields temporarily locked to protect edits.

![First tab opens while preparing](batch-06.png)

### 7. Second tab opens while preparing

Healthy. No extra Next or Start click; the second tab is active before its response completes.

![Second tab opens while preparing](batch-07.png)

### 8. Review while the next item prepares

Healthy. First result is editable; one existing banner contains navigation. Editing pauses auto-follow.

![Review while the next item prepares](batch-08.png)

### 9. Batch finished and ready to review

Healthy. Second result keeps both photos and generated fields. Exactly two logical model results and one final cleanup.

![Batch finished and ready to review](batch-09.png)

### 10. Batch overview keeps review links

Healthy. Each prepared listing remains accessible; no duplicate navigation banner.

![Batch overview keeps review links](batch-10-detail.png)

[Full viewport](batch-10.png)

## Single computer item

### 11. Single computer photo ready

Healthy. One actual file selected and retained. The standard Generate control remains.

![Single computer photo ready](single-computer-01.png)

### 12. Single item generating

Healthy. Same page and photo remain; the request is held by the local model fixture.

![Single item generating](single-computer-02.png)

### 13. Single result is editable

Healthy. Photo retained, generated title and description visible, Generate reusable.

![Single result is editable](single-computer-03.png)

## Single phone item

### 14. Single phone photos received

Healthy. Actual browser downloads and file attachment; the phone session metadata is controlled locally.

![Single phone photos received](single-phone-01.png)

### 15. Phone photos generating on the same listing

Healthy. Both photos remain on the listing while generation runs.

![Phone photos generating on the same listing](single-phone-02.png)

### 16. Single phone result ready

Healthy. Both retained photos and editable output remain. Generate is usable again.

![Single phone result ready](single-phone-03.png)

## Exceptional recovery

### 17. Connection wait

Healthy. Automatic retry, retained photos and honest Waiting display. No forced Resume click.

![Connection wait](recovery-01.png)

### 18. Explicit Stop preserves photos

Healthy. Seller Stop pauses the batch and preserves the exact saved request and photos.

![Explicit Stop preserves photos](recovery-02.png)

### 19. Explicit recovery finishes once

Healthy. New work tab replays the saved request. One exact request ID, one identical payload and one modeled result.

![Explicit recovery finishes once](recovery-03.png)

### 20. Server result still finishing

Healthy. Controlled server commit-pending response shows Waiting and Finishing generation, with the exact ready count. Automatic replay continues.

![Server result still finishing](recovery-04.png)

### 21. Photo download waits automatically

Actual extension and files. One source-photo fetch was interrupted locally. No generation request was made while waiting.

![Photo download waits automatically](photo-download-wait.png)

### 22. The new tab keeps a calm waiting state

One existing status banner. This controlled interruption requires no Resume click.

![The new tab keeps a calm waiting state](photo-download-tab-wait.png)

### 23. Photo download recovers after a worker restart

Primary-operated browser journey. The connection returned and the batch finished automatically: two photos, one injection, one modeled generation and one cleanup.

![Photo download recovers after a worker restart](photo-download-recovered.png)

### 24. Completion survives a temporary checkpoint failure

Primary-operated actual MV3 batch. One controlled final storage write failed, then the existing checkpoint retry completed safely. One modeled generation, two retained listing photos and one cleanup. Reload showed no false Resume prompt. No paid generation or live marketplace action.

![Completion survives a temporary checkpoint failure](terminal-complete.png)

## Web app batch

### 25. First-use style preferences

Healthy. Existing compact preference setup; no batch redesign.

![First-use style preferences](web-01.png)

### 26. Web batch photos ready to group

Healthy. Existing compact web grouping. Four actual local photos.

![Web batch photos ready to group](web-02.png)

### 27. Web batch ready for Start

Healthy. Two grouped drafts. Start stays explicit.

![Web batch ready for Start](web-03.png)

### 28. Batch starts in place

Healthy. No automatic navigation on mobile.

![Batch starts in place](web-04.png)

### 29. First item ready before the batch finishes

Healthy. Ready row offers Review instead of settings; second item continues.

![First item ready before the batch finishes](web-05.png)

### 30. Review and Copy while the batch continues

Healthy. Compact progress remains; Copy works, unfinished Next is disabled.

![Review and Copy while the batch continues](web-06.png)

### 31. Batch finishes without moving the seller

Healthy. Text edits and focus remain; Next ready item is now available.

![Batch finishes without moving the seller](web-07.png)

### 32. Explicit next ready item

Healthy. Next opens Dress 2. Seller chooses when to move; Copy and Mark as listed remain accessible.

![Explicit next ready item](web-08.png)

### 33. Both ready rows offer Review

Healthy. Settings icons are replaced by Review on ready items.

![Both ready rows offer Review](web-09.png)

### 34. Small phone review

Healthy. At 320px the progress, Copy controls and Mark as listed fit without horizontal overflow.

![Small phone review](web-10.png)

### 35. Failed replacement identifies the previous text

Primary-operated browser with a controlled HTTP422. Existing Copy previous buttons preserve earlier work without another paid generation. Needs attention remains visible; the footer offers an optional explicit Retry with its cost.

![Failed replacement identifies the previous text](web-failed-replacement.png)

### 36. The failure state at 320 pixels

Primary-operated viewport check. No horizontal overflow or extra recovery panel.

![The failure state at 320 pixels](web-failed-small.png)

### 37. Explicit retry restores the normal review screen

Primary clicked Retry against the local model. Photos remained, the new text appeared, and ordinary Copy and Mark as listed returned.

![Explicit retry restores the normal review screen](web-retry-ready.png)

### 38. Other failed items remain visible after retry and reload

Automated real-browser evidence, separately inspected. One item was retried successfully. The other still shows Needs attention after reload.

![Other failed items remain visible after retry and reload](web-other-failure.png)

## Web app single item

### 39. Single web item with photos

Healthy. Existing compact single-item workspace and Generate.

![Single web item with photos](web-single-01.png)

### 40. Single web item prepares in place

Healthy. Photos stay visible and there is no batch navigation.

![Single web item prepares in place](web-single-02.png)

### 41. Single web result ready to Copy

Healthy. Existing compact review screen, clipboard works, photos retained.

![Single web result ready to Copy](web-single-03.png)

## Phone transport

### 42. Connection loss keeps the selected photos

Passed. Actual multipart upload over loopback HTTP with controlled socket loss. Automatic retry and explicit Cancel remain available.

![Connection loss keeps the selected photos](phone-transport-01.png)

### 43. Progressing slow upload completes

Passed. One actual upload took about 60 seconds without a retry. The noise image is deliberate high-entropy test data.

![Progressing slow upload completes](phone-transport-02.png)

### 44. Expired session is terminal

Passed. Explicit HTTP 410 shows clear expiry guidance without revived Retry or Cancel controls.

![Expired session is terminal](phone-transport-03.png)

### 45. Seller cancellation stops retrying

Passed. Actual browser Cancel stops retries and leaves the cancelled screen. The disabled photo control cannot restart this session.

![Seller cancellation stops retrying](phone-transport-04.png)

## Observed limits for final review

The manual review caught a misleading 99% during connection waiting. The corrected screen shows Waiting and identifies the waiting item, while its exact ready count remains visible. The regression passed three rounds, including worker restart, and the primary repeated the pictured recovery walkthrough. Screenshots alone do not certify assistive-technology behavior, full keyboard access, arbitrary browser suspension recovery or live marketplace compatibility. Automated assertions and full gates are recorded in the acceptance evidence.
