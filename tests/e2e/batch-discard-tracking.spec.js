const { test, expect } = require("@playwright/test");
const { openBatchJourney } = require("./batch-journey");

test("reloading an unacknowledged user discard does not misreport another generation pause", async () => {
  const flow = await openBatchJourney({ generate: ({ route }) => route.fulfill({ status: 400,
    json: { error: "Controlled invalid input" } }) });
  try {
    await flow.start();
    await expect(flow.controller.locator(".batch-recovery-discard")).toBeVisible();
    await flow.context.route("https://autolister.app/api/phone-upload**", route =>
      new URL(route.request().url()).searchParams.get("action") === "cleanup"
        ? route.fulfill({ status: 500, json: { error: "Controlled cleanup failure" } }) : route.fallback());
    await flow.controller.locator(".batch-recovery-discard").click();
    await expect(flow.controller.locator(".batch-title")).toHaveText("Discard not finished");
    await flow.controller.reload();
    await expect(flow.controller.locator(".batch-title")).toHaveText("Discard not finished");
    await expect(flow.controller.locator(".batch-recovery-resume")).toHaveCount(0);
    await flow.worker.evaluate(() => AutoListerBackgroundTelemetry.flush());
    const queued = await flow.worker.evaluate(async () => (await chrome.storage.local.get("autolisterTelemetryV2")).autolisterTelemetryV2);
    const events = [...flow.events, ...(queued?.events || []).map(entry => entry.event)];
    const pending = events.filter(event => event.context?.reason === "discard_pending");
    expect(pending.some(event => event.event === "batch_paused")).toBe(false);
    const cancelled = pending.find(event => event.event === "batch_cancelled");
    expect(cancelled?.context.generationAttemptId).toBe(flow.requests[0].body.generationAttemptId);
    // Keep the original genuine generation rejection visible and joinable.
    expect(events.some(event => event.event === "batch_paused" && event.context?.reason === "generation_error" &&
      event.context?.generationAttemptId === flow.requests[0].body.generationAttemptId)).toBe(true);
  } finally { await flow.close(); }
});
