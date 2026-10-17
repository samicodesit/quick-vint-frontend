const { test, expect } = require("@playwright/test");
const { openBatchJourney } = require("./batch-journey");

test("late paused progress cannot revive Resume after discard intent is durable", async () => {
  const flow = await openBatchJourney({ generate: ({ route }) => route.fulfill({ status: 400, json: { error: "Controlled invalid input" } }) });
  try {
    await flow.worker.evaluate(() => {
      const send = chrome.tabs.sendMessage.bind(chrome.tabs);
      chrome.tabs.sendMessage = (id, message, ...rest) => {
        if (message.type === "BATCH_PROGRESS" && message.status === "paused") globalThis.__qaOldPause = { ...message };
        return send(id, message, ...rest);
      };
    });
    await flow.start();
    await expect(flow.controller.locator(".batch-recovery-resume")).toBeVisible();
    const old = await flow.worker.evaluate(() => globalThis.__qaOldPause);
    await flow.context.route("https://autolister.app/api/phone-upload**", route =>
      new URL(route.request().url()).searchParams.get("action") === "cleanup"
        ? route.fulfill({ status: 500, json: { error: "Controlled cleanup failure" } }) : route.fallback());
    await flow.controller.locator(".batch-recovery-discard").click();
    await expect(flow.controller.locator(".batch-title")).toHaveText("Discard not finished");
    const before = await flow.controller.locator(".batch-body").innerText();
    const response = await flow.worker.evaluate(({ id, message }) => chrome.tabs.sendMessage(id, message), { id: flow.sourceTabId, message: old });
    expect(response.ok).toBe(false);
    expect(await flow.controller.locator(".batch-body").innerText()).toBe(before);
    await expect(flow.controller.locator(".batch-recovery-resume")).toHaveCount(0);
    expect((await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery.discardRequested).toBe(true);
    expect(flow.requests).toHaveLength(1);
    expect(flow.cleanup).toHaveLength(0);
  } finally { await flow.close(); }
});
