const { test, expect } = require("@playwright/test");
const { openBatchJourney } = require("./batch-journey");

test("late old-batch progress cannot replace a newer controller or stop its heartbeat", async () => {
  test.setTimeout(60000);
  let release;
  const held = new Promise(resolve => { release = resolve; });
  const flow = await openBatchJourney({ photos: 1, generate: async ({ route, request, requests, commits }) => {
    if (requests.length === 1) return route.fulfill({ status: 400, json: { error: "Controlled invalid input" } });
    if (requests.length === 2) await held;
    return route.fulfill({ json: commits.get(request.id) });
  } });
  try {
    await flow.worker.evaluate(() => {
      globalThis.__qaProgress = [];
      globalThis.__qaHeartbeats = 0;
      const send = chrome.tabs.sendMessage.bind(chrome.tabs);
      chrome.tabs.sendMessage = (id, message, ...rest) => {
        if (message.type === "BATCH_PROGRESS") globalThis.__qaProgress.push({ ...message });
        return send(id, message, ...rest);
      };
      chrome.runtime.onMessage.addListener(message => {
        if (message.type === "QUICKVINT_TAB_JOB_HEARTBEAT") globalThis.__qaHeartbeats++;
      });
    });
    await flow.start();
    await expect(flow.controller.locator(".batch-title")).toHaveText("Batch paused");
    const old = await flow.worker.evaluate(() => globalThis.__qaProgress.find(message => message.status === "paused"));
    expect(old.batchId).toBeTruthy();
    await flow.controller.locator(".batch-recovery-discard").click();
    await flow.start();
    await expect.poll(() => flow.requests.length).toBe(2);
    const current = (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery;
    expect(current.batchId).not.toBe(old.batchId);
    const before = await flow.controller.locator(".batch-body").innerText();
    const actual = { ...await flow.worker.evaluate(() => globalThis.__qaProgress.findLast(message => message.batchId !== globalThis.__qaProgress[0].batchId)),
      generationAttemptId: current.currentGenerationAttemptId };
    expect((await flow.worker.evaluate(({ id, message }) => chrome.tabs.sendMessage(id, message), {
      id: flow.sourceTabId, message: actual,
    })).ok).toBe(true);
    for (const change of [{ ownerId: "other" }, { sourceTabId: -1 }, { itemIndex: 99 },
      { generationAttemptId: "stale-attempt" }, { stopRevision: -1 }, { checkpointStatus: "done" }]) {
      const response = await flow.worker.evaluate(({ id, message }) => chrome.tabs.sendMessage(id, message), {
        id: flow.sourceTabId, message: { ...actual, ...change, message: "Stale current-batch snapshot" },
      });
      expect(response.ok).toBe(false);
      expect(await flow.controller.locator(".batch-body").innerText()).toBe(before);
    }
    for (const status of ["paused", "done", "waiting", "failed"]) {
      const response = await flow.worker.evaluate(({ id, message }) => chrome.tabs.sendMessage(id, message), {
        id: flow.sourceTabId, message: { ...old, status, message: "Stale previous batch", offers: [] },
      });
      expect(response.ok).toBe(false);
      expect(await flow.controller.locator(".batch-body").innerText()).toBe(before);
    }
    const beats = await flow.worker.evaluate(() => globalThis.__qaHeartbeats);
    await expect.poll(() => flow.worker.evaluate(() => globalThis.__qaHeartbeats), { timeout: 23000 }).toBeGreaterThan(beats);
    await flow.controller.locator(".batch-stop").click();
    await expect(flow.controller.locator(".batch-recovery-resume")).toBeVisible();
    const stopped = (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery;
    expect(stopped.batchId).toBe(current.batchId);
    expect(stopped.reason).toBe("user_stopped");
    expect(flow.requests).toHaveLength(2);
  } finally { release(); await flow.close(); }
});
