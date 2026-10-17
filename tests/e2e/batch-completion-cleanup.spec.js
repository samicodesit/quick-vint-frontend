const { test, expect } = require("@playwright/test");
const { openBatchJourney, sendFromExtensionContent } = require("./batch-journey");

test("slow completion cleanup cannot hold a ready listing or erase a later batch", async () => {
  let releaseCleanup, releaseNext;
  const cleanupReady = new Promise(resolve => { releaseCleanup = resolve; });
  const nextReady = new Promise(resolve => { releaseNext = resolve; });
  const flow = await openBatchJourney({ generate: async ({ route, request, requests, commits }) => {
    if (requests.length === 2) await nextReady;
    return route.fulfill({ json: commits.get(request.id) });
  } });
  let firstCleanupSession;
  try {
    await flow.context.route("https://autolister.app/api/phone-upload**", async route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get("action") === "cleanup") {
        firstCleanupSession ||= url.searchParams.get("sessionId");
        if (url.searchParams.get("sessionId") === firstCleanupSession) await cleanupReady;
      }
      return route.fallback();
    });
    await flow.start();
    await expect.poll(() => firstCleanupSession).toBeTruthy();
    // Generation and host fields are already durably complete. Housekeeping
    // must not keep the seller waiting or block the next explicit Start.
    await expect(flow.controller.locator(".batch-title")).toHaveText("Listings ready", { timeout: 2000 });
    expect(flow.cleanup).toHaveLength(0);
    await flow.controller.locator(".batch-dismiss").click();
    await expect(flow.controller.locator("#quickvint-batch-modal")).toHaveCount(0);
    const next = await sendFromExtensionContent(flow.context, flow.controller, {
      type: "START_BATCH_GENERATION", sessionId: "next-local-cleanup-session", inputSource: "phone", groups: [flow.files],
    });
    expect(next.ok).toBe(true);
    await expect.poll(() => flow.requests.length).toBe(2);
    releaseCleanup();
    await expect.poll(() => flow.cleanup.length).toBe(1);
    const saved = (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery;
    expect(saved.batchId).toBe(next.batchId);
    expect(saved.status).toBe("running");
    releaseNext();
    await expect.poll(() => flow.cleanup.length).toBe(2);
    expect(new Set(flow.requests.map(request => request.id)).size).toBe(2);
    const work = flow.context.pages().filter(page => page !== flow.controller && page.url().includes("/items/new"));
    expect(work).toHaveLength(2);
    for (const page of work) await expect(page.locator('[data-testid="media-upload-grid"] img')).toHaveCount(2);
  } finally { releaseCleanup(); releaseNext(); await flow.close(); }
});
