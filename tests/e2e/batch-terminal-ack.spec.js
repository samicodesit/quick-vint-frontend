const { test, expect } = require("@playwright/test");
const { openBatchJourney } = require("./batch-journey");

for (const freshSetup of [false, true]) test(`delayed completion delivery preserves terminal proof${freshSetup ? " without taking over a fresh setup" : " and reaches ready"}`, async () => {
  const flow = await openBatchJourney();
  try {
    await flow.worker.evaluate(() => chrome.storage.local.set({ "quickvintBatchReviewPrompt:test-user": { snoozedAt: Date.now() } }));
    await flow.worker.evaluate(() => {
      const run = runBatchGenerationJob;
      runBatchGenerationJob = async job => {
        try { return await run(job); }
        finally { globalThis.__qaBatchSettled = true; }
      };
      const send = chrome.tabs.sendMessage.bind(chrome.tabs);
      const gate = new Promise(resolve => { globalThis.__qaReleaseDone = resolve; });
      chrome.tabs.sendMessage = async (id, message, ...rest) => {
        if (message.type === "BATCH_PROGRESS" && message.status === "done") {
          globalThis.__qaDoneHeld = true;
          await gate;
        }
        return send(id, message, ...rest);
      };
    });
    await flow.start();
    await expect.poll(() => flow.worker.evaluate(() => globalThis.__qaDoneHeld)).toBe(true);
    await expect.poll(() => flow.worker.evaluate(() => globalThis.__qaBatchSettled)).toBe(true);
    expect(flow.cleanup).toHaveLength(1);
    const records = await flow.worker.evaluate(() => chrome.storage.local.get(["quickvintBatchRecovery", "quickvintBatchReviews"]));
    expect(Object.values(records.quickvintBatchReviews).some(record => record.completion?.status === "done")).toBe(true);
    expect(records.quickvintBatchRecovery).toBeUndefined();
    if (freshSetup) {
      flow.controller.once("dialog", dialog => dialog.accept());
      await flow.controller.locator(".batch-close").click();
      await flow.controller.locator("#quickvint-phone-btn").click();
      await flow.controller.locator(".quickvint-upload-choice-multiple").click();
      await expect(flow.controller.locator("#quickvint-batch-modal")).toHaveClass(/organizing/);
      const work = flow.context.pages().find(page => page !== flow.controller && page.url().includes("/items/new"));
      await work.bringToFront();
      await flow.controller.bringToFront();
      await flow.controller.waitForTimeout(300);
    }
    await flow.worker.evaluate(() => globalThis.__qaReleaseDone());
    if (freshSetup) await expect(flow.controller.locator("#quickvint-batch-modal")).toHaveClass(/organizing/);
    else await expect(flow.controller.locator(".batch-title")).toHaveText("Listings ready");
    expect(flow.requests).toHaveLength(1);
  } finally {
    await flow.worker.evaluate(() => globalThis.__qaReleaseDone?.()).catch(() => {});
    await flow.close();
  }
});
