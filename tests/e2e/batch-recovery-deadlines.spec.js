const { test, expect } = require("@playwright/test");
const { openBatchJourney, sendFromExtensionContent } = require("./batch-journey");

async function pausedBatch() {
  const flow = await openBatchJourney({ generate: ({ route, request, requests, commits }) =>
    requests.length === 1 ? route.fulfill({ status: 400, json: { error: "Controlled invalid input" } })
      : route.fulfill({ json: commits.get(request.id) }) });
  await flow.start();
  await expect(flow.controller.locator(".batch-recovery-resume")).toBeVisible();
  return flow;
}

async function accelerateRecoveryDeadline(flow) {
  // Actual AbortController/fetch cancellation, with only its 20-second timer
  // accelerated. This is a controlled deadline check, not elapsed wall time.
  await flow.worker.evaluate(() => {
    globalThis.__qaRecoverySetTimeout = setTimeout;
    globalThis.setTimeout = (callback, delay, ...args) =>
      globalThis.__qaRecoverySetTimeout(callback, delay === 20000 ? 500 : delay, ...args);
  });
}

for (const operation of ["metadata", "cleanup"]) {
  test(`a stalled recovery ${operation} request aborts and leaves an explicit retry usable`, async () => {
    const flow = await pausedBatch();
    let release;
    const ready = new Promise(resolve => { release = resolve; });
    let held = 0;
    try {
      await accelerateRecoveryDeadline(flow);
      await flow.context.route("https://autolister.app/api/phone-upload**", async route => {
        const url = new URL(route.request().url());
        if (operation === "metadata" ? url.searchParams.get("includeUrls") === "1" : url.searchParams.get("action") === "cleanup") {
          held++;
          await ready;
        }
        return route.fallback();
      });
      const saved = await flow.worker.evaluate(() => chrome.storage.local.get(["quickvintBatchRecovery", "quickvintBatchGenerationRequest"]));
      const button = flow.controller.locator(operation === "metadata" ? ".batch-recovery-resume" : ".batch-recovery-discard");
      await button.click();
      await expect.poll(() => held).toBe(1);
      await expect(button).toBeEnabled();
      const after = await flow.worker.evaluate(() => chrome.storage.local.get(["quickvintBatchRecovery", "quickvintBatchGenerationRequest"]));
      expect(after.quickvintBatchRecovery.batchId).toBe(saved.quickvintBatchRecovery.batchId);
      expect(after.quickvintBatchGenerationRequest.requestId).toBe(saved.quickvintBatchGenerationRequest.requestId);
      expect(flow.requests).toHaveLength(1);
      expect(flow.cleanup).toHaveLength(0);
      if (operation === "metadata") await expect(flow.controller.locator(".batch-status")).toContainText("Checking saved photos timed out");
      release();
      await flow.worker.evaluate(() => { globalThis.setTimeout = globalThis.__qaRecoverySetTimeout; });
      await button.click();
      if (operation === "metadata") await expect(flow.controller.locator(".batch-title")).toHaveText("Listings ready");
      else await expect(flow.controller.locator("#quickvint-batch-modal")).toHaveCount(0);
      // Aborting fetch cannot retract an operation already accepted by a server.
      // The fixture may process that cancelled request after its held response
      // is released, followed by the one explicit, idempotent cleanup retry.
      await expect.poll(() => flow.cleanup.length).toBeGreaterThanOrEqual(1);
      expect(flow.cleanup.length).toBeLessThanOrEqual(operation === "cleanup" ? 2 : 1);
      if (operation === "cleanup") {
        expect(flow.cleanup.every(reason => reason === "cancelled")).toBe(true);
        expect(await flow.worker.evaluate(() => chrome.storage.local.get(["quickvintBatchRecovery", "quickvintBatchGenerationRequest"]))).toEqual({});
        expect(flow.requests).toHaveLength(1);
      }
    } finally { release(); await flow.close(); }
  });
}

test("a queued Discard cannot cancel a Resume that has already taken ownership", async () => {
  const flow = await pausedBatch();
  let releaseMetadata, releaseGeneration;
  const metadata = new Promise(resolve => { releaseMetadata = resolve; });
  const generation = new Promise(resolve => { releaseGeneration = resolve; });
  let metadataHits = 0;
  let resume, discard;
  try {
    await flow.context.route("https://autolister.app/api/phone-upload**", async route => {
      if (new URL(route.request().url()).searchParams.get("includeUrls") === "1") {
        metadataHits++;
        await metadata;
      }
      return route.fallback();
    });
    await flow.context.route("https://autolister.app/api/generate", async route => {
      await generation;
      return route.fallback();
    });
    const saved = (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery;
    resume = sendFromExtensionContent(flow.context, flow.controller, { type: "RESUME_BATCH_GENERATION", batchId: saved.batchId });
    await expect.poll(() => metadataHits).toBe(1);
    discard = sendFromExtensionContent(flow.context, flow.controller, { type: "DISCARD_BATCH_RECOVERY", batchId: saved.batchId });
    releaseMetadata();
    expect((await resume).ok).toBe(true);
    expect((await discard).ok).toBe(false);
    expect(flow.cleanup).toHaveLength(0);
    releaseGeneration();
    await expect(flow.controller.locator(".batch-title")).toHaveText("Listings ready");
    await expect.poll(() => flow.cleanup.length).toBe(1);
    expect(flow.requests).toHaveLength(2);
  } finally {
    releaseMetadata(); releaseGeneration();
    await Promise.allSettled([resume, discard]);
    await flow.close();
  }
});
