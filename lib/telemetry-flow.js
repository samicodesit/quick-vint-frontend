(function (root) {
  "use strict";
  function photoState(images, expected) {
    const seen = new Set();
    const counts = { visiblePhotoCount: images.length, pendingCount: 0, failedPhotoCount: 0,
      previewPhotoCount: 0, duplicatePhotoCount: 0, unrecognizedPhotoCount: 0 };
    for (const image of images) {
      try {
        const url = new URL(image.currentSrc || image.src);
        if (["blob:", "data:"].includes(url.protocol)) counts.previewPhotoCount++;
        else if (url.protocol !== "https:" || !/(^|\.)vinted\.(net|com)$/.test(url.hostname)) counts.unrecognizedPhotoCount++;
        else if (!image.complete) counts.pendingCount++;
        else if (!(image.naturalWidth > 0)) counts.failedPhotoCount++;
        else if (seen.has(url.origin + url.pathname)) counts.duplicatePhotoCount++;
        else seen.add(url.origin + url.pathname);
      } catch { counts.unrecognizedPhotoCount++; }
    }
    return { confirmed: expected > 0 && seen.size >= expected, count: seen.size, ...counts };
  }
  // Observation metadata only. No batch control decision reads these values.
  function batchTiming(previous, next, now = Date.now(), options = {}) {
    const old = previous?.diagnostics || {};
    const result = Object.fromEntries(['batchStartedAt', 'batchFinishedAt', 'pauseCount', 'resumeCount',
      'pauseDurationMs', '_pausedAt', 'resumeTrigger', 'automaticRecoveryCount'].filter(key => old[key] !== undefined).map(key => [key, old[key]]));
    result.timingComplete = options.initialize === true || old.timingComplete === true;
    const started = Number(next.createdAt);
    if (!Number.isFinite(started) || started <= 0 || now < started) return { timingComplete: false };
    result.batchStartedAt = new Date(started).toISOString();
    result.pauseCount = Number(old.pauseCount || 0);
    result.resumeCount = Number(old.resumeCount || 0);
    result.pauseDurationMs = Number(old.pauseDurationMs || 0);
    if (options.reattach) {
      result.automaticRecoveryCount = Number(old.automaticRecoveryCount || 0) + 1;
      result.resumeTrigger ||= 'automatic_worker_reattach';
    }
    if (next.status === 'paused' && previous?.status !== 'paused') {
      result.pauseCount++;
      result._pausedAt = now;
    }
    if (options.resume && previous?.status === 'paused' && next.status === 'running') {
      if (Number.isFinite(old._pausedAt)) result.pauseDurationMs += Math.max(0, now - old._pausedAt);
      else result.timingComplete = false;
      delete result._pausedAt;
      result.resumeCount++;
      result.resumeTrigger = 'user_resume';
    }
    if (next.status === 'done') result.batchFinishedAt ||= new Date(now).toISOString();
    const end = result.batchFinishedAt ? Date.parse(result.batchFinishedAt) : now;
    result.recoveryAgeMs = Math.max(0, end - started);
    const pendingPause = next.status === 'paused' && Number.isFinite(result._pausedAt) ? Math.max(0, now - result._pausedAt) : 0;
    if (result.timingComplete) result.activeDurationMs = Math.max(0, result.recoveryAgeMs - result.pauseDurationMs - pendingPause);
    else delete result.activeDurationMs;
    result.recoveredFromPause = next.status === 'done' && result.pauseCount > 0;
    return result;
  }
  function observe({ operationId, expected, gridSelector, imageSelector, fieldsApplied, expectedAccountId }) {
    if (!root.document || !operationId) return () => {};
    let finished = false;
    let reportedError = false;
    const report = (event, context) => { void root.AutoListerTelemetry?.track(event, { operationId, expectedPhotoCount: expected, ...context }, "extension_content", false, expectedAccountId); };
    const check = () => {
      if (finished) return;
      const grid = document.querySelector(gridSelector);
      if (!grid) return;
      const photos = photoState(Array.from(grid.querySelectorAll(imageSelector)), expected);
      const visibleError = Array.from(grid.querySelectorAll('[aria-invalid="true"]')).find((element) => element.getClientRects().length && element.textContent?.trim());
      if (visibleError && !reportedError) {
        reportedError = true;
        report("host_photos_rejected", { errorCode: "HOST_PHOTO_FORM_ERROR", message: visibleError.textContent.trim().slice(0, 500), confirmedPhotoCount: photos.count });
      }
      if (photos.confirmed && !visibleError) {
        report("photos_confirmed", { confirmedPhotoCount: photos.count });
        if (fieldsApplied) report("listing_review", { confirmedPhotoCount: photos.count });
        stop();
      }
    };
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["src", "aria-invalid", "aria-busy"] });
    const timer = setInterval(check, 1000);
    const expiry = setTimeout(stop, 300000);
    function onPageHide() { if (!finished) report("operation_interrupted", { reason: "page_closed_or_reloaded" }); stop(); }
    function stop() { root.removeEventListener("pagehide", onPageHide); finished = true; observer.disconnect(); clearInterval(timer); clearTimeout(expiry); }
    root.addEventListener("pagehide", onPageHide, { once: true });
    check();
    return stop;
  }
  async function confirmFields({ operationId, expectedTitle, expectedDescription, titleInput, descriptionInput, wait, photoCount, gridSelector, imageSelector, expectedAccountId }) {
    let userEdited = false;
    const onInput = (event) => { if (event.isTrusted) userEdited = true; };
    const report = (event, context) => { void root.AutoListerTelemetry?.track(event, { operationId, photoCount, ...context }, "extension_content", false, expectedAccountId); };
    titleInput?.addEventListener("input", onInput);
    descriptionInput?.addEventListener("input", onInput);
    try {
      await wait(expectedTitle, expectedDescription, 2500, 500);
    } catch (error) {
      report(userEdited ? "listing_review" : "fields_apply_failed", userEdited
        ? { reason: "user_edited_during_confirmation", lastConfirmedStage: "generation_received" }
        : { ...error.fieldConfirmation, errorCode: "FIELDS_NOT_CONFIRMED", message: error.message, lastConfirmedStage: "generation_received" });
      return;
    } finally {
      titleInput?.removeEventListener("input", onInput);
      descriptionInput?.removeEventListener("input", onInput);
    }
    report("fields_applied", {});
    report("listing_review", { lastConfirmedStage: "fields_applied" });
    try { observe({ operationId, expected: photoCount, gridSelector, imageSelector, fieldsApplied: true, expectedAccountId }); } catch { /* Observation cannot interrupt listing work. */ }
  }
  const api = { photoState, batchTiming, observe, confirmFields };
  root.AutoListerFlowEvidence = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
