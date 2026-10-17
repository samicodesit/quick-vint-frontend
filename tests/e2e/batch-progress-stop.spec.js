const { test, expect } = require("@playwright/test");
const { openBatchJourney } = require("./batch-journey");

test("Stop during progress delivery prevents the pending generation dispatch", async () => {
  const flow = await openBatchJourney({ photos: 1 });
  try {
    await flow.worker.evaluate(() => {
      const send = chrome.tabs.sendMessage.bind(chrome.tabs);
      const gate = new Promise(resolve => { globalThis.__qaReleaseProgress = resolve; });
      chrome.tabs.sendMessage = async (id, message, ...rest) => {
        if (message.type === "BATCH_PROGRESS" && message.status === "generating") {
          globalThis.__qaProgressHeld = true;
          await gate;
        }
        return send(id, message, ...rest);
      };
    });
    await flow.start();
    await expect.poll(() => flow.worker.evaluate(() => globalThis.__qaProgressHeld)).toBe(true);
    await flow.controller.locator(".batch-stop").click();
    await expect(flow.controller.locator(".batch-recovery-resume")).toBeVisible();
    await flow.worker.evaluate(() => globalThis.__qaReleaseProgress());
    await flow.controller.waitForTimeout(250);
    expect(flow.requests).toHaveLength(0);
    await expect(flow.controller.locator(".batch-title")).toHaveText("Batch paused");
    const saved = (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery;
    expect(saved.reason).toBe("user_stopped");
    expect(saved.completedCount).toBe(0);
    expect(flow.cleanup).toHaveLength(0);
    await flow.controller.locator(".batch-recovery-resume").click();
    await expect(flow.controller.locator(".batch-title")).toHaveText("Listings ready");
    expect(flow.requests).toHaveLength(1);
  } finally {
    await flow.worker.evaluate(() => globalThis.__qaReleaseProgress?.()).catch(() => {});
    await flow.close();
  }
});
