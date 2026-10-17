const { test, expect } = require("@playwright/test");
const { openBatchJourney } = require("./batch-journey");

test("closing progress cannot hide a later host-photo failure from diagnostics", async () => {
  let release;
  const ready = new Promise(resolve => { release = resolve; });
  const flow = await openBatchJourney({ rejectHostPhotos: true, hostRejectMessage: "Controlled host photo rejection",
    generate: async ({ route, request, commits }) => { await ready; return route.fulfill({ json: commits.get(request.id) }); },
  });
  try {
    await flow.start();
    await expect.poll(() => flow.requests.length).toBe(1);
    flow.controller.once("dialog", dialog => dialog.accept());
    await flow.controller.locator(".batch-close").click();
    await expect(flow.controller.locator("#quickvint-batch-modal")).toHaveCount(0);
    release();
    await expect.poll(async () => (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery?.status).toBe("paused");
    let events;
    await expect.poll(async () => {
      await flow.worker.evaluate(() => AutoListerBackgroundTelemetry.flush());
      const saved = await flow.worker.evaluate(async () => (await chrome.storage.local.get("autolisterTelemetryV2")).autolisterTelemetryV2);
      events = [...flow.events, ...(saved?.events || []).map(entry => entry.event)];
      return events.some(event => event.event === "batch_paused");
    }).toBe(true);
    const paused = events.find(event => event.event === "batch_paused");
    expect(paused).toBeTruthy();
    expect(paused.context.generationAttemptId).toBe(flow.requests[0].body.generationAttemptId);
    expect(paused.context.batchId).toBe(flow.requests[0].body.batchId || events.find(event => event.event === "batch_item_started").context.batchId);
    expect(paused.context.message).toContain("Vinted could not upload");
    expect(flow.cleanup).toHaveLength(0);
    expect(flow.requests).toHaveLength(1);
    const work = flow.context.pages().find(page => page !== flow.controller && page.url().includes("/items/new"));
    expect(await work.locator('input[type="file"]').evaluate(input => input.files.length)).toBe(2);
  } finally { release(); await flow.close(); }
});
