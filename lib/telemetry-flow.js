(function (root) {
  "use strict";
  function photoState(images, expected) {
    const seen = new Set();
    for (const image of images) {
      try {
        const url = new URL(image.currentSrc || image.src);
        if (url.protocol === "https:" && /(^|\.)vinted\.(net|com)$/.test(url.hostname) && image.complete && image.naturalWidth > 0) seen.add(url.origin + url.pathname);
      } catch { /* Blob and unknown host state remain unconfirmed. */ }
    }
    return { confirmed: expected > 0 && seen.size >= expected, count: seen.size };
  }
  function observe({ operationId, expected, gridSelector, imageSelector, fieldsApplied }) {
    if (!root.document || !operationId) return () => {};
    let finished = false;
    let reportedError = false;
    const report = (event, context) => { void root.AutoListerTelemetry?.track(event, { operationId, expectedPhotoCount: expected, ...context }); };
    const check = () => {
      if (finished) return;
      const grid = document.querySelector(gridSelector);
      if (!grid) return;
      const photos = photoState(Array.from(grid.querySelectorAll(imageSelector)), expected);
      const visibleError = Array.from(grid.querySelectorAll('[role="alert"], [aria-invalid="true"]')).find((element) => element.getClientRects().length && element.textContent?.trim());
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
  async function confirmFields({ operationId, expectedTitle, expectedDescription, titleInput, descriptionInput, wait, photoCount, gridSelector, imageSelector }) {
    let userEdited = false;
    const onInput = (event) => { if (event.isTrusted) userEdited = true; };
    const report = (event, context) => { void root.AutoListerTelemetry?.track(event, { operationId, photoCount, ...context }); };
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
    try { observe({ operationId, expected: photoCount, gridSelector, imageSelector, fieldsApplied: true }); } catch { /* Observation cannot interrupt listing work. */ }
  }
  const api = { photoState, observe, confirmFields };
  root.AutoListerFlowEvidence = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
