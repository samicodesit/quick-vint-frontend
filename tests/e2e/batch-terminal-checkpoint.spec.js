const { test, expect } = require("@playwright/test");
const { openBatchJourney, sendFromExtensionContent } = require("./batch-journey");

for (const failure of ["final-write-once", "terminal-remove"]) {
  test(`completed batch stays complete after ${failure}, reload and a new start`, async () => {
    const flow = await openBatchJourney();
    let completionAtCleanup;
    try {
      await flow.worker.evaluate(failure => {
        const set = chrome.storage.local.set.bind(chrome.storage.local);
        const remove = chrome.storage.local.remove.bind(chrome.storage.local);
        let failed = false;
        chrome.storage.local.set = async values => {
          if (failure === "final-write-once" && !failed && values.quickvintBatchRecovery?.status === "done") {
            failed = true;
            throw new Error("Controlled terminal checkpoint failure");
          }
          return set(values);
        };
        chrome.storage.local.remove = async keys => {
          if (failure === "terminal-remove" && [keys].flat().includes("quickvintBatchRecovery")) {
            throw new Error("Controlled terminal removal failure");
          }
          return remove(keys);
        };
      }, failure);
      await flow.context.route("https://autolister.app/api/phone-upload**", async route => {
        if (new URL(route.request().url()).searchParams.get("action") === "cleanup") {
          completionAtCleanup = (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery;
        }
        return route.fallback();
      });
      await flow.start();
      await expect(flow.controller.locator(".batch-title")).toHaveText("Listings ready");
      await expect.poll(() => flow.cleanup.length).toBe(1);
      expect(completionAtCleanup.status).toBe("done");
      expect(completionAtCleanup.completedCount).toBe(1);
      expect(flow.requests).toHaveLength(1);
      expect(flow.commits.size).toBe(1);
      await flow.controller.reload();
      await expect(flow.controller.locator("#quickvint-phone-btn")).toBeVisible();
      const restored = await sendFromExtensionContent(flow.context, flow.controller, { type: "GET_BATCH_RECOVERY" });
      expect(restored.recovery?.status || "done").toBe("done");
      await expect(flow.controller.locator(".batch-recovery-resume")).toHaveCount(0);
      const next = await sendFromExtensionContent(flow.context, flow.controller, {
        type: "START_BATCH_GENERATION", sessionId: "next-local-session", inputSource: "phone", groups: [flow.files],
      });
      expect(next.ok).toBe(true);
      await expect.poll(() => flow.cleanup.length).toBe(2);
      expect(flow.requests).toHaveLength(2);
      expect(flow.commits.size).toBe(2);
    } finally { await flow.close(); }
  });
}

test("persistent terminal checkpoint failure preserves photos and exact request for safe recovery", async () => {
  const flow = await openBatchJourney();
  try {
    await flow.worker.evaluate(() => {
      const set = chrome.storage.local.set.bind(chrome.storage.local);
      globalThis.__qaRejectTerminal = true;
      chrome.storage.local.set = async values => {
        if (globalThis.__qaRejectTerminal && values.quickvintBatchRecovery?.status === "done") {
          throw new Error("Controlled persistent terminal checkpoint failure");
        }
        return set(values);
      };
    });
    await flow.start();
    await expect(flow.controller.locator(".batch-recovery-resume")).toBeVisible();
    const saved = await flow.worker.evaluate(() => chrome.storage.local.get(["quickvintBatchRecovery", "quickvintBatchGenerationRequest"]));
    expect(saved.quickvintBatchRecovery.completedCount).toBe(0);
    expect(saved.quickvintBatchRecovery.groups[0]).toHaveLength(2);
    expect(saved.quickvintBatchGenerationRequest.requestId).toBe(flow.requests[0].id);
    expect(flow.cleanup).toHaveLength(0);
    await flow.controller.reload();
    await expect(flow.controller.locator(".batch-recovery-resume")).toHaveText("Resume 1 remaining");
    await flow.worker.evaluate(() => { globalThis.__qaRejectTerminal = false; });
    await flow.controller.locator(".batch-recovery-resume").click();
    await expect.poll(() => flow.cleanup.length).toBe(1);
    expect(flow.requests).toHaveLength(2);
    expect(flow.requests[1].id).toBe(flow.requests[0].id);
    expect(flow.requests[1].rawBody).toBe(flow.requests[0].rawBody);
    expect(flow.commits.size).toBe(1);
  } finally { await flow.close(); }
});
