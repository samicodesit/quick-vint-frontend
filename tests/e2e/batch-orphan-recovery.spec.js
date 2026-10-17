const { test, expect } = require("@playwright/test");
const { openBatchJourney, sendFromExtensionContent } = require("./batch-journey");

async function freshTabAfterClosingBatch(flow, restart = false) {
  const fresh = await flow.context.newPage();
  const work = flow.context.pages().filter(page => page !== fresh && page !== flow.controller && page.url().includes("/items/new"));
  const stopWorker = async () => {
    const cdp = await flow.context.newCDPSession(fresh);
    const { targetInfos } = await cdp.send("Target.getTargets");
    const target = targetInfos.find(info => info.type === "service_worker" && info.url.endsWith("/background.js"));
    expect(target).toBeTruthy();
    await cdp.send("Target.closeTarget", { targetId: target.targetId });
    await cdp.detach();
  };
  if (restart === "before") await stopWorker();
  await flow.controller.close();
  for (const page of work) await page.close();
  if (restart === true) await stopWorker();
  await fresh.goto("https://www.vinted.com/items/new", { waitUntil: "domcontentloaded" });
  await expect(fresh.locator("#quickvint-phone-btn")).toBeVisible();
  let worker;
  await expect.poll(async () => {
    for (const candidate of flow.context.serviceWorkers()) {
      try { if (await candidate.evaluate(() => Boolean(chrome.storage?.local))) { worker = candidate; return true; } }
      catch { /* A terminated worker can remain listed until its close event. */ }
    }
    return false;
  }).toBe(true);
  return { fresh, worker };
}

async function pausedFlow(options = {}) {
  const flow = await openBatchJourney({ ...options, generate: ({ route, request, requests, commits }) =>
    requests.length === (options.groupSizes ? 2 : 1) ? route.fulfill({ status: 400, json: { error: "Controlled rejection" } })
      : route.fulfill({ json: commits.get(request.id) }) });
  await flow.start();
  await expect(flow.controller.locator(".batch-recovery-resume")).toBeVisible();
  return flow;
}

test("fresh same-account tab restores a running batch after all original tabs close and worker restarts", async () => {
  let release;
  const held = new Promise(resolve => { release = resolve; });
  const flow = await openBatchJourney({ groupSizes: [1, 1], generate: async ({ route, request, requests, commits }) => {
    if (requests.length === 1) await held;
    return route.fulfill({ json: commits.get(request.id) }).catch(() => {});
  } });
  try {
    await flow.start();
    await expect.poll(() => flow.requests.length).toBe(1);
    const before = (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery;
    const { fresh, worker } = await freshTabAfterClosingBatch(flow, true);
    release();
    await expect(fresh.locator(".batch-recovery-resume")).toBeVisible();
    expect(flow.requests).toHaveLength(1);
    const recovered = await sendFromExtensionContent(flow.context, fresh, { type: "GET_BATCH_RECOVERY" });
    expect(recovered.recovery.batchId).toBe(before.batchId);
    expect(recovered.recovery.ownerId).toBe(before.ownerId);
    expect(recovered.recovery.groups).toEqual(before.groups);
    expect(recovered.recovery.status).toBe("paused");
    const saved = (await worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery;
    expect(saved.sourceTabId).not.toBe(before.sourceTabId);
    await fresh.locator(".batch-recovery-resume").click();
    await expect(fresh.locator(".batch-title")).toHaveText("Listings ready");
    await expect.poll(() => flow.cleanup.length).toBe(1);
    expect(flow.requests).toHaveLength(3);
    expect(flow.requests[1].id).toBe(flow.requests[0].id);
    expect(flow.requests[1].rawBody).toBe(flow.requests[0].rawBody);
    expect(new Set(flow.requests.map(request => request.id)).size).toBe(2);
    for (const page of flow.context.pages().filter(page => page !== fresh && page.url().includes("/items/new"))) {
      expect(await page.locator('input[type="file"]').evaluate(input => input.files.length)).toBe(1);
    }
    const lastWork = flow.context.pages().filter(page => page !== fresh && page.url().includes("/items/new")).at(-1);
    await lastWork.bringToFront();
    await lastWork.getByRole("button", { name: "Back to batch", exact: true }).click();
    await expect.poll(() => worker.evaluate(async () => (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0]?.id)).toBe(saved.sourceTabId);
  } finally { release(); await flow.close(); }
});

test("fresh same-account recovery supports acknowledged discard without another generation", async () => {
  const flow = await pausedFlow();
  try {
    const before = (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery;
    const { fresh, worker } = await freshTabAfterClosingBatch(flow);
    await expect(fresh.locator(".batch-recovery-discard")).toBeVisible();
    await expect(fresh.locator(".batch-status")).toContainText(before.message);
    expect((await sendFromExtensionContent(flow.context, fresh, { type: "GET_BATCH_RECOVERY" })).recovery.batchId).toBe(before.batchId);
    await fresh.locator(".batch-recovery-discard").click();
    await expect(fresh.locator("#quickvint-batch-modal")).toHaveCount(0);
    const records = await worker.evaluate(() => chrome.storage.local.get(["quickvintBatchRecovery", "quickvintBatchGenerationRequest"]));
    expect(records.quickvintBatchRecovery).toBeUndefined();
    expect(records.quickvintBatchGenerationRequest).toBeUndefined();
    expect(flow.cleanup).toHaveLength(1);
    expect(flow.requests).toHaveLength(1);
  } finally { await flow.close(); }
});

test("a source tab navigated away from the create page does not strand the saved batch", async () => {
  const flow = await pausedFlow();
  try {
    const before = (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery;
    for (const work of flow.context.pages().filter(page => page !== flow.controller && page.url().includes("/items/new"))) await work.close();
    await flow.controller.goto("about:blank");
    const fresh = await flow.context.newPage();
    await fresh.goto("https://www.vinted.com/items/new");
    await expect(fresh.locator(".batch-recovery-resume")).toBeVisible();
    const saved = (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery;
    expect(saved.sourceTabId).not.toBe(before.sourceTabId);
    expect(saved.batchId).toBe(before.batchId);
    expect(saved.groups).toEqual(before.groups);
    expect(flow.requests).toHaveLength(1);
    await fresh.locator(".batch-recovery-resume").click();
    await expect(fresh.locator(".batch-title")).toHaveText("Listings ready");
    expect(flow.requests[1].rawBody).toBe(flow.requests[0].rawBody);
  } finally { await flow.close(); }
});

test("Return recreates a controller whose old tab navigated away", async () => {
  const flow = await pausedFlow({ groupSizes: [1, 1] });
  try {
    const before = (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery;
    const work = flow.context.pages().filter(page => page !== flow.controller && page.url().includes("/items/new"));
    await work[1].close();
    await flow.controller.goto("about:blank");
    await work[0].bringToFront();
    await work[0].locator(".quickvint-batch-recovery-return").click();
    await expect.poll(async () => (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery.sourceTabId).not.toBe(before.sourceTabId);
    const saved = (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery;
    let restored;
    await expect.poll(() => {
      restored = flow.context.pages().find(page => page !== flow.controller && page !== work[0] && page.url().includes("/items/new"));
      return Boolean(restored);
    }).toBe(true);
    await expect(restored.locator(".batch-recovery-resume")).toBeVisible();
    await work[0].bringToFront();
    await work[0].getByRole("button", { name: "Back to batch", exact: true }).click();
    await expect.poll(() => flow.worker.evaluate(async () => (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0]?.id)).toBe(saved.sourceTabId);
    expect(flow.requests).toHaveLength(2);
    expect(flow.cleanup).toHaveLength(0);
    expect(await work[0].locator('input[type="file"]').evaluate(input => input.files.length)).toBe(1);
  } finally { await flow.close(); }
});

test("lost tabs after worker interruption do not leave a paused batch claiming it is still finishing", async () => {
  let pending = true;
  const flow = await openBatchJourney({ generate: ({ route, request, commits }) => pending
    ? route.fulfill({ status: 503, headers: { "Retry-After": "1" }, json: { code: "generation_commit_pending", error: "Still finishing" } })
    : route.fulfill({ json: commits.get(request.id) }) });
  try {
    await flow.start();
    await expect.poll(async () => (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery?.reason).toBe("generation_pending");
    const { fresh, worker } = await freshTabAfterClosingBatch(flow, "before");
    await expect(fresh.locator(".batch-recovery-resume")).toBeVisible();
    const saved = (await worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery;
    expect(saved.status).toBe("paused");
    expect(saved.reason).not.toBe("generation_pending");
    await expect(fresh.locator(".batch-status")).not.toContainText(/finishing/i);
    expect(flow.cleanup).toHaveLength(0);
    pending = false;
    await fresh.locator(".batch-recovery-resume").click();
    await expect(fresh.locator(".batch-title")).toHaveText("Listings ready");
    expect(new Set(flow.requests.map(request => request.id)).size).toBe(1);
  } finally { await flow.close(); }
});

test("a surviving bound listing prevents a fresh tab from taking its controller", async () => {
  const flow = await pausedFlow({ groupSizes: [1, 1] });
  try {
    const before = (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery;
    const workPages = flow.context.pages().filter(page => page !== flow.controller && page.url().includes("/items/new"));
    const work = workPages[0];
    await workPages[1].close();
    await flow.controller.close();
    const fresh = await flow.context.newPage();
    await fresh.goto("https://www.vinted.com/items/new");
    await expect(fresh.locator("#quickvint-phone-btn")).toBeVisible();
    expect((await sendFromExtensionContent(flow.context, fresh, { type: "GET_BATCH_RECOVERY" })).recovery).toBeNull();
    await expect(fresh.locator("#quickvint-batch-modal")).toHaveCount(0);
    expect((await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery.sourceTabId).toBe(before.sourceTabId);
    await expect(work.locator(".quickvint-batch-recovery-return")).toBeVisible();
    await work.locator(".quickvint-batch-recovery-return").click();
    await expect.poll(() => flow.context.pages().filter(page => page !== fresh && page !== work && page.url().includes("/items/new")).length).toBe(1);
    const restored = (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery;
    await work.bringToFront();
    await work.getByRole("button", { name: "Back to batch", exact: true }).click();
    await expect.poll(() => flow.worker.evaluate(async () => (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0]?.id)).toBe(restored.sourceTabId);
    expect(flow.requests).toHaveLength(2);
    expect(flow.cleanup).toHaveLength(0);
  } finally { await flow.close(); }
});

test("another account cannot claim a batch after every original tab closes", async () => {
  const flow = await pausedFlow();
  try {
    const original = await flow.worker.evaluate(() => chrome.storage.local.get(["supabaseSession", "quickvintBatchRecovery"]));
    await flow.worker.evaluate(session => chrome.storage.local.set({ supabaseSession: { ...session, user: { id: "different-account" } } }), original.supabaseSession);
    const { fresh, worker } = await freshTabAfterClosingBatch(flow);
    const result = await sendFromExtensionContent(flow.context, fresh, { type: "GET_BATCH_RECOVERY" });
    expect(result.recovery).toBeNull();
    expect(result.batchId).toBeUndefined();
    await expect(fresh.locator("#quickvint-batch-modal")).toHaveCount(0);
    expect((await worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery).toEqual(original.quickvintBatchRecovery);
    expect(flow.requests).toHaveLength(1);
    expect(flow.cleanup).toHaveLength(0);
    await worker.evaluate(session => chrome.storage.local.set({ supabaseSession: session }), original.supabaseSession);
    await expect(fresh.locator(".batch-recovery-resume")).toBeVisible();
  } finally { await flow.close(); }
});

test("concurrent fresh tabs restore only one existing recovery controller", async () => {
  const flow = await pausedFlow();
  try {
    const a = await flow.context.newPage();
    const b = await flow.context.newPage();
    const work = flow.context.pages().find(page => ![flow.controller, a, b].includes(page) && page.url().includes("/items/new"));
    await flow.controller.close();
    await work.close();
    await Promise.all([a, b].map(page => page.goto("https://www.vinted.com/items/new")));
    for (const page of [a, b]) await expect(page.locator("#quickvint-phone-btn")).toBeVisible();
    const results = await Promise.all([a, b].map(page => sendFromExtensionContent(flow.context, page, { type: "GET_BATCH_RECOVERY" })));
    expect(results.filter(result => result.recovery)).toHaveLength(1);
    expect(await a.locator("#quickvint-batch-modal").count() + await b.locator("#quickvint-batch-modal").count()).toBe(1);
    expect(flow.requests).toHaveLength(1);
    expect(flow.cleanup).toHaveLength(0);
  } finally { await flow.close(); }
});

for (const state of ["expired", "discard_pending"]) test(`fresh recovery preserves ${state} without reviving Resume`, async () => {
  const flow = await pausedFlow();
  let cleanupFails = state === "discard_pending";
  try {
    await flow.context.route("https://autolister.app/api/phone-upload**", route => {
      const url = new URL(route.request().url());
      if (state === "expired" && url.searchParams.get("includeUrls") === "1") return route.fulfill({ status: 410, json: { error: "Expired" } });
      if (cleanupFails && url.searchParams.get("action") === "cleanup") return route.fulfill({ status: 500, json: { error: "Controlled cleanup failure" } });
      return route.fallback();
    });
    if (state === "expired") {
      await flow.controller.locator(".batch-recovery-resume").click();
      await expect(flow.controller.locator(".batch-recovery-discard")).toHaveText("Start new batch");
    } else {
      await flow.controller.locator(".batch-recovery-discard").click();
      await expect(flow.controller.locator(".batch-title")).toHaveText("Discard not finished");
    }
    const { fresh, worker } = await freshTabAfterClosingBatch(flow);
    await expect(fresh.locator(".batch-recovery-discard")).toBeVisible();
    await expect(fresh.locator(".batch-recovery-resume")).toHaveCount(0);
    const saved = (await worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery;
    expect(state === "expired" ? saved.status : saved.reason).toBe(state);
    if (state === "discard_pending") await expect(fresh.locator(".batch-progress-note")).toHaveCount(0);
    cleanupFails = false;
    await fresh.locator(".batch-recovery-discard").click();
    await expect.poll(() => flow.cleanup.length).toBe(1);
    expect(flow.requests).toHaveLength(1);
    await expect.poll(async () => (await worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery).toBeUndefined();
    await expect(fresh.locator("#quickvint-batch-modal")).toHaveCount(0);
  } finally { await flow.close(); }
});

test("failed controller restoration preserves the batch and blocks a conflicting new upload until retry", async () => {
  const flow = await pausedFlow();
  try {
    const before = await flow.worker.evaluate(() => chrome.storage.local.get(["quickvintBatchRecovery", "quickvintBatchGenerationRequest"]));
    await flow.worker.evaluate(() => {
      const set = chrome.storage.local.set.bind(chrome.storage.local);
      globalThis.__qaDenyRestore = true;
      chrome.storage.local.set = values => {
        if (globalThis.__qaDenyRestore && values.quickvintBatchRecovery) return Promise.reject(new Error("Controlled restore storage failure"));
        return set(values);
      };
    });
    const { fresh, worker } = await freshTabAfterClosingBatch(flow);
    const response = await sendFromExtensionContent(flow.context, fresh, { type: "GET_BATCH_RECOVERY" });
    expect(response.ok).toBe(false);
    await fresh.locator("#quickvint-phone-btn").click();
    await fresh.locator(".quickvint-upload-choice-multiple").click();
    await expect(fresh.locator("#quickvint-toast")).toContainText("Could not restore the saved batch");
    await expect(fresh.locator("#quickvint-batch-modal")).toHaveCount(0);
    expect(await worker.evaluate(() => chrome.storage.local.get(["quickvintBatchRecovery", "quickvintBatchGenerationRequest"]))).toEqual(before);
    expect(flow.requests).toHaveLength(1);
    expect(flow.cleanup).toHaveLength(0);
    await worker.evaluate(() => { globalThis.__qaDenyRestore = false; });
    await fresh.locator(".quickvint-upload-choice-multiple").click();
    await expect(fresh.locator(".batch-recovery-resume")).toBeVisible();
  } finally { await flow.close(); }
});
