const { test, expect } = require("@playwright/test");
const { openBatchJourney } = require("./batch-journey");

async function capturedEvents(flow) {
  await flow.worker.evaluate(() => AutoListerBackgroundTelemetry.flush());
  const saved = await flow.worker.evaluate(async () => (await chrome.storage.local.get("autolisterTelemetryV2")).autolisterTelemetryV2);
  return [...flow.events, ...(saved?.events || []).map(entry => entry.event)];
}

test("a batch item joins request, immediate API rejection and paused worker evidence by its attempt", async () => {
  const flow = await openBatchJourney({ generate: ({ route }) => route.fulfill({
    status: 403, contentType: "application/json", body: JSON.stringify({ code: "account_paused", error: "Local account pause fixture" }),
  }) });
  try {
    await flow.start();
    await expect(flow.controller.locator(".batch-recovery-resume")).toBeVisible();
    const attempt = flow.requests[0].body.generationAttemptId;
    const events = await capturedEvents(flow);
    const limit = events.find(event => event.event === "generate_limit_hit");
    expect(limit).toBeTruthy();
    expect(limit.context.generationAttemptId).toBe(attempt);
    expect(limit.context.batchId).toBeTruthy();
    expect(limit.context.itemIndex).toBe(1);
    const started = events.find(event => event.event === "batch_item_started");
    expect(started?.context.generationAttemptId).toBe(attempt);
    const paused = events.find(event => event.event === "batch_paused");
    expect(paused?.context.generationAttemptId).toBe(attempt);
    expect(flow.cleanup).toHaveLength(0);
  } finally { await flow.close(); }
});

test("batch completion evidence retains the same per-item attempt as its exact generate payload", async () => {
  const flow = await openBatchJourney();
  try {
    await flow.start();
    await expect.poll(() => flow.cleanup.length).toBe(1);
    const events = await capturedEvents(flow);
    const attempt = flow.requests[0].body.generationAttemptId;
    expect(events.find(event => event.event === "batch_item_started")?.context.generationAttemptId).toBe(attempt);
    expect(events.find(event => event.event === "batch_complete")?.context.generationAttemptId).toBe(attempt);
    const success = events.find(event => event.event === "generate_success");
    expect(success?.context.generationAttemptId).toBe(attempt);
    expect(success?.context.batchId).toBeTruthy();
    expect(success?.context.itemIndex).toBe(1);
    expect(flow.requests).toHaveLength(1);
  } finally { await flow.close(); }
});

test("reloading the batch controller preserves the rejected item's attempt in recovery evidence", async () => {
  const flow = await openBatchJourney({ generate: ({ route }) => route.fulfill({ status: 400,
    json: { error: "Local invalid input fixture" } }) });
  try {
    await flow.start();
    await expect(flow.controller.locator('.batch-recovery-resume')).toBeVisible();
    flow.controller.on('dialog', dialog => dialog.accept());
    await flow.controller.reload({ waitUntil: 'domcontentloaded' });
    await expect(flow.controller.locator('.batch-recovery-resume')).toBeVisible();
    const events = await capturedEvents(flow);
    const recovery = events.find(event => event.event === 'batch_recovery_available');
    expect(recovery?.context.generationAttemptId).toBe(flow.requests[0].body.generationAttemptId);
    expect(recovery?.context.itemIndex).toBe(1);
    expect(flow.requests).toHaveLength(1);
    expect(flow.cleanup).toHaveLength(0);
  } finally { await flow.close(); }
});
