const { test, expect } = require("@playwright/test");
const { openBatchJourney, sendFromExtensionContent } = require("./batch-journey");

async function pausedBatch(options = {}) {
  const flow = await openBatchJourney({ ...options, generate: ({ route, request, requests, commits }) =>
    requests.length === (options.groupSizes ? 2 : 1)
      ? route.fulfill({ status: 400, json: { error: "Controlled invalid input" } })
      : route.fulfill({ json: commits.get(request.id) }) });
  await flow.start();
  await expect(flow.controller.locator(".batch-recovery-resume")).toBeVisible();
  return flow;
}

function holdRecoveryMetadata(flow) {
  let release;
  const ready = new Promise(resolve => { release = resolve; });
  let hits = 0;
  const installed = flow.context.route("https://autolister.app/api/phone-upload**", async route => {
    if (route.request().method() === "GET" && new URL(route.request().url()).searchParams.get("includeUrls") === "1") {
      hits++;
      await ready;
    }
    return route.fallback();
  });
  return { installed, release, get hits() { return hits; } };
}

test("simultaneous Return clicks from retained listings create one recovery controller", async () => {
  const flow = await pausedBatch({ photos: 2, groupSizes: [1, 1] });
  try {
    const work = flow.context.pages().filter(page => page !== flow.controller && page.url().includes("/items/new"));
    expect(work).toHaveLength(2);
    await flow.controller.close();
    await flow.worker.evaluate(() => {
      const create = chrome.tabs.create.bind(chrome.tabs);
      globalThis.__qaRecoveryCreates = 0;
      const ready = new Promise(resolve => { globalThis.__qaReleaseRecoveryCreate = resolve; });
      chrome.tabs.create = async (options, callback) => {
        if (options.url?.includes("/items/new")) {
          globalThis.__qaRecoveryCreates++;
          await ready;
        }
        return callback ? create(options, callback) : create(options);
      };
    });
    for (const page of work) await expect(page.locator(".quickvint-batch-recovery-return")).toBeVisible();
    await Promise.all(work.map(page => page.locator(".quickvint-batch-recovery-return").click()));
    await expect.poll(() => flow.worker.evaluate(() => globalThis.__qaRecoveryCreates)).toBeGreaterThan(0);
    await work[0].waitForTimeout(150);
    await flow.worker.evaluate(() => globalThis.__qaReleaseRecoveryCreate());
    for (const page of work) await expect(page.locator(".quickvint-batch-recovery-return")).toHaveCount(0);
    expect(flow.context.pages().filter(page => !work.includes(page) && page.url().includes("/items/new"))).toHaveLength(1);
    const controller = flow.context.pages().find(page => !work.includes(page) && page.url().includes("/items/new"));
    await expect(controller.locator(".batch-recovery-resume")).toBeVisible();
    await controller.locator(".batch-recovery-resume").click();
    await expect(controller.locator(".batch-title")).toHaveText("Listings ready");
    await expect.poll(() => flow.cleanup.length).toBe(1);
    expect(flow.requests).toHaveLength(3);
    expect(new Set(flow.requests.map(request => request.id)).size).toBe(2);
  } finally {
    await flow.worker.evaluate(() => globalThis.__qaReleaseRecoveryCreate?.()).catch(() => {});
    await flow.close();
  }
});

test("duplicate bound Resume messages during metadata refresh start only one runner", async () => {
  const flow = await pausedBatch();
  const metadata = holdRecoveryMetadata(flow);
  let first, second;
  try {
    await metadata.installed;
    const saved = (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery;
    const message = { type: "RESUME_BATCH_GENERATION", batchId: saved.batchId };
    first = sendFromExtensionContent(flow.context, flow.controller, message);
    await expect.poll(() => metadata.hits).toBe(1);
    second = sendFromExtensionContent(flow.context, flow.controller, message);
    await flow.controller.waitForTimeout(150);
    metadata.release();
    const responses = await Promise.all([first, second]);
    expect(responses.filter(response => response.ok)).toHaveLength(1);
    await expect(flow.controller.locator(".batch-title")).toHaveText("Listings ready");
    await expect.poll(() => flow.cleanup.length).toBe(1);
    expect(flow.requests).toHaveLength(2);
    expect(new Set(flow.requests.map(request => request.id)).size).toBe(1);
    expect(flow.context.pages().filter(page => page !== flow.controller && page.url().includes("/items/new"))).toHaveLength(2);
  } finally {
    metadata.release();
    await Promise.allSettled([first, second]);
    await flow.close();
  }
});

test("acknowledged Stop invalidates an in-flight Resume without another generation", async () => {
  const flow = await pausedBatch();
  const metadata = holdRecoveryMetadata(flow);
  let resume;
  try {
    await metadata.installed;
    const saved = (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery;
    const work = flow.context.pages().find(page => page !== flow.controller && page.url().includes("/items/new"));
    resume = sendFromExtensionContent(flow.context, flow.controller, { type: "RESUME_BATCH_GENERATION", batchId: saved.batchId });
    await expect.poll(() => metadata.hits).toBe(1);
    const stop = await sendFromExtensionContent(flow.context, work, { type: "STOP_BATCH_GENERATION", batchId: saved.batchId });
    expect(stop.ok).toBe(true);
    metadata.release();
    expect((await resume).ok).toBe(false);
    await flow.controller.waitForTimeout(250);
    const after = (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery;
    expect(after.status).toBe("paused");
    expect(after.reason).toBe("user_stopped");
    expect(flow.requests).toHaveLength(1);
    expect(flow.cleanup).toHaveLength(0);
    expect(await work.locator('input[type="file"]').evaluate(input => input.files.length)).toBe(2);
    await flow.controller.locator(".batch-recovery-resume").click();
    await expect(flow.controller.locator(".batch-title")).toHaveText("Listings ready");
    expect(flow.requests).toHaveLength(2);
    expect(new Set(flow.requests.map(request => request.id)).size).toBe(1);
  } finally { metadata.release(); await Promise.allSettled([resume]); await flow.close(); }
});

for (const queuedCount of [2, 4]) test(`${queuedCount} Resume messages queued before Stop all stay cancelled`, async () => {
  const flow = await pausedBatch();
  const metadata = holdRecoveryMetadata(flow);
  const pending = [];
  try {
    await metadata.installed;
    const saved = (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery;
    const work = flow.context.pages().find(page => page !== flow.controller && page.url().includes("/items/new"));
    const message = { type: "RESUME_BATCH_GENERATION", batchId: saved.batchId };
    pending.push(sendFromExtensionContent(flow.context, flow.controller, message));
    await expect.poll(() => metadata.hits).toBe(1);
    for (let i = 1; i < queuedCount; i++) pending.push(sendFromExtensionContent(flow.context, flow.controller, message));
    await flow.controller.waitForTimeout(150);
    expect((await sendFromExtensionContent(flow.context, work, { type: "STOP_BATCH_GENERATION", batchId: saved.batchId })).ok).toBe(true);
    metadata.release();
    const results = await Promise.all(pending);
    expect(results.every(result => result.ok === false && result.stopped === true)).toBe(true);
    await flow.controller.waitForTimeout(250);
    expect(flow.requests).toHaveLength(1);
    expect(flow.cleanup).toHaveLength(0);
    const after = (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery;
    expect(after.status).toBe("paused");
    expect(after.reason).toBe("user_stopped");
    await flow.controller.locator(".batch-recovery-resume").click();
    await expect(flow.controller.locator(".batch-title")).toHaveText("Listings ready");
    expect(flow.requests).toHaveLength(2);
    expect(new Set(flow.requests.map(request => request.id)).size).toBe(1);
  } finally { metadata.release(); await Promise.allSettled(pending); await flow.close(); }
});

test("Stop superseding a visible Resume is cancellation evidence, not another recovery failure", async () => {
  const flow = await pausedBatch();
  const metadata = holdRecoveryMetadata(flow);
  try {
    await metadata.installed;
    const saved = (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery;
    const work = flow.context.pages().find(page => page !== flow.controller && page.url().includes("/items/new"));
    await flow.controller.locator(".batch-recovery-resume").click();
    await expect.poll(() => metadata.hits).toBe(1);
    expect((await sendFromExtensionContent(flow.context, work, { type: "STOP_BATCH_GENERATION", batchId: saved.batchId })).ok).toBe(true);
    metadata.release();
    await expect(flow.controller.locator(".batch-recovery-resume")).toBeEnabled();
    await expect(flow.controller.locator(".batch-status")).toContainText("Batch stopped.");
    await flow.worker.evaluate(() => AutoListerTelemetry.flush());
    expect(flow.requests).toHaveLength(1);
    expect(flow.events.filter(event => event.event === "batch_paused")).toHaveLength(1);
    expect(flow.events.some(event => event.event === "batch_resume_failed")).toBe(false);
    expect(flow.events.some(event => event.event === "batch_cancelled" && event.context.reason === "user_stopped"
      && event.context.generationAttemptId === flow.requests[0].body.generationAttemptId)).toBe(true);
  } finally { metadata.release(); await flow.close(); }
});

test("Stop also cancels an older queued Discard before it can delete source photos", async () => {
  const flow = await pausedBatch();
  const metadata = holdRecoveryMetadata(flow);
  let resume, discard;
  try {
    await metadata.installed;
    const saved = (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery;
    const work = flow.context.pages().find(page => page !== flow.controller && page.url().includes("/items/new"));
    resume = sendFromExtensionContent(flow.context, flow.controller, { type: "RESUME_BATCH_GENERATION", batchId: saved.batchId });
    await expect.poll(() => metadata.hits).toBe(1);
    discard = sendFromExtensionContent(flow.context, work, { type: "DISCARD_BATCH_RECOVERY", batchId: saved.batchId });
    await flow.controller.waitForTimeout(150);
    expect((await sendFromExtensionContent(flow.context, work, { type: "STOP_BATCH_GENERATION", batchId: saved.batchId })).ok).toBe(true);
    metadata.release();
    expect((await resume).stopped).toBe(true);
    expect((await discard).stopped).toBe(true);
    expect(flow.cleanup).toHaveLength(0);
    expect(flow.requests).toHaveLength(1);
    const after = (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery;
    expect(after.batchId).toBe(saved.batchId);
    expect(after.reason).toBe("user_stopped");
    expect((await sendFromExtensionContent(flow.context, flow.controller, { type: "DISCARD_BATCH_RECOVERY", batchId: saved.batchId })).ok).toBe(true);
    expect(flow.cleanup).toHaveLength(1);
  } finally { metadata.release(); await Promise.allSettled([resume, discard]); await flow.close(); }
});

test("Resume disables conflicting Discard while recovery metadata is pending", async () => {
  const flow = await pausedBatch();
  const metadata = holdRecoveryMetadata(flow);
  try {
    await metadata.installed;
    await flow.controller.locator(".batch-recovery-resume").click();
    await expect.poll(() => metadata.hits).toBe(1);
    await expect(flow.controller.locator(".batch-recovery-discard")).toBeDisabled();
    expect(flow.cleanup).toHaveLength(0);
    metadata.release();
    await expect(flow.controller.locator(".batch-title")).toHaveText("Listings ready");
    await expect.poll(() => flow.cleanup.length).toBe(1);
  } finally { metadata.release(); await flow.close(); }
});

test("Stop also wins after Resume reserves the runner and is clearing its old guidance", async () => {
  const flow = await pausedBatch();
  let resume;
  try {
    await flow.worker.evaluate(() => {
      const send = chrome.tabs.sendMessage.bind(chrome.tabs);
      globalThis.__qaClearingNudge = false;
      const gate = new Promise(resolve => { globalThis.__qaReleaseClearNudge = resolve; });
      chrome.tabs.sendMessage = async (tabId, message, callback) => {
        if (message.type === "CLEAR_BATCH_RECOVERY_NUDGE") {
          globalThis.__qaClearingNudge = true;
          await gate;
        }
        return callback ? send(tabId, message, callback) : send(tabId, message);
      };
    });
    const saved = (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery;
    const work = flow.context.pages().find(page => page !== flow.controller && page.url().includes("/items/new"));
    resume = sendFromExtensionContent(flow.context, flow.controller, { type: "RESUME_BATCH_GENERATION", batchId: saved.batchId });
    await expect.poll(() => flow.worker.evaluate(() => globalThis.__qaClearingNudge)).toBe(true);
    expect((await sendFromExtensionContent(flow.context, work, { type: "STOP_BATCH_GENERATION", batchId: saved.batchId })).ok).toBe(true);
    await flow.worker.evaluate(() => globalThis.__qaReleaseClearNudge());
    expect((await resume).ok).toBe(false);
    await flow.controller.waitForTimeout(200);
    const after = (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery;
    expect(after.status).toBe("paused");
    expect(after.reason).toBe("user_stopped");
    expect(flow.requests).toHaveLength(1);
    expect(flow.cleanup).toHaveLength(0);
    await flow.controller.locator(".batch-recovery-resume").click();
    await expect(flow.controller.locator(".batch-title")).toHaveText("Listings ready");
    expect(flow.requests).toHaveLength(2);
  } finally {
    await flow.worker.evaluate(() => globalThis.__qaReleaseClearNudge?.()).catch(() => {});
    await Promise.allSettled([resume]);
    await flow.close();
  }
});

test("Stop before the opened listing tab is ready issues no generation request", async () => {
  const flow = await openBatchJourney();
  try {
    await flow.worker.evaluate(() => {
      const send = chrome.tabs.sendMessage.bind(chrome.tabs);
      globalThis.__qaBatchReadyHeld = false;
      const gate = new Promise(resolve => { globalThis.__qaReleaseBatchReady = resolve; });
      chrome.tabs.sendMessage = async (tabId, message, callback) => {
        if (message.type === "BATCH_PING") {
          globalThis.__qaBatchReadyHeld = true;
          await gate;
        }
        return callback ? send(tabId, message, callback) : send(tabId, message);
      };
    });
    await flow.start();
    await expect.poll(() => flow.worker.evaluate(() => globalThis.__qaBatchReadyHeld)).toBe(true);
    // This is the real source modal's visible Stop control, before content work.
    await flow.controller.locator(".batch-stop").click();
    await expect(flow.controller.locator(".batch-recovery-resume")).toBeVisible();
    await flow.worker.evaluate(() => globalThis.__qaReleaseBatchReady());
    await flow.controller.waitForTimeout(250);
    expect(flow.requests).toHaveLength(0);
    expect(flow.cleanup).toHaveLength(0);
    await flow.controller.locator(".batch-recovery-resume").click();
    await expect(flow.controller.locator(".batch-title")).toHaveText("Listings ready");
    expect(flow.requests).toHaveLength(1);
  } finally {
    await flow.worker.evaluate(() => globalThis.__qaReleaseBatchReady?.()).catch(() => {});
    await flow.close();
  }
});

test("failed discard cleanup retains its exact request and supports an explicit retry", async () => {
  const flow = await pausedBatch();
  let cleanupFails = true;
  try {
    await flow.context.route("https://autolister.app/api/phone-upload**", route =>
      new URL(route.request().url()).searchParams.get("action") === "cleanup" && cleanupFails
        ? route.fulfill({ status: 500, json: { error: "Controlled cleanup failure" } }) : route.fallback());
    const before = await flow.worker.evaluate(() => chrome.storage.local.get(["quickvintBatchRecovery", "quickvintBatchGenerationRequest"]));
    await flow.controller.locator(".batch-recovery-discard").click();
    await expect(flow.controller.locator(".batch-recovery-discard")).toBeVisible();
    await expect.poll(async () => (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery?.batchId).toBe(before.quickvintBatchRecovery.batchId);
    const after = await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchGenerationRequest"));
    expect(after.quickvintBatchGenerationRequest.requestId).toBe(before.quickvintBatchGenerationRequest.requestId);
    expect(flow.cleanup).toHaveLength(0);
    await expect(flow.controller.locator(".batch-recovery-resume")).toHaveCount(0);
    await expect(flow.controller.locator(".batch-title")).toHaveText("Discard not finished");
    await expect(flow.controller.locator(".batch-progress-count")).toHaveCount(0);
    await expect(flow.controller.locator(".batch-status")).toHaveCount(0);
    const work = flow.context.pages().find(page => page !== flow.controller && page.url().includes("/items/new"));
    await expect(work.locator("#quickvint-batch-recovery-title")).toHaveText("Discard not finished");
    cleanupFails = false;
    await flow.controller.locator(".batch-recovery-discard").click();
    await expect(flow.controller.locator("#quickvint-batch-modal")).toHaveCount(0);
    await expect.poll(() => flow.cleanup.length).toBe(1);
    expect(await flow.worker.evaluate(() => chrome.storage.local.get(["quickvintBatchRecovery", "quickvintBatchGenerationRequest"]))).toEqual({});
    await expect(work.locator(".quickvint-batch-recovery-return")).toHaveCount(0);
    await expect(work.locator('[data-testid="media-upload-grid"] img')).toHaveCount(2);
  } finally { await flow.close(); }
});

test("acknowledged discard removes obsolete Return guidance from the retained listing", async () => {
  const flow = await pausedBatch();
  try {
    const work = flow.context.pages().find(page => page !== flow.controller && page.url().includes("/items/new"));
    await expect(work.locator(".quickvint-batch-recovery-return")).toBeVisible();
    await flow.worker.evaluate(async () => {
      const job = (await chrome.storage.local.get("quickvintBatchRecovery")).quickvintBatchRecovery;
      for (const message of [
        { ownerId: "different-account", batchId: job.batchId },
        { ownerId: job.ownerId, batchId: "late-older-batch" },
      ]) await chrome.tabs.sendMessage(job.currentWorkTabId, { type: "CLEAR_BATCH_RECOVERY_NUDGE", ...message });
    });
    await expect(work.locator(".quickvint-batch-recovery-return")).toBeVisible();
    await flow.controller.locator(".batch-recovery-discard").click();
    await expect(flow.controller.locator("#quickvint-batch-modal")).toHaveCount(0);
    await expect(work.locator(".quickvint-batch-recovery-return")).toHaveCount(0);
    await expect(work.locator('[data-testid="media-upload-grid"] img')).toHaveCount(2);
  } finally { await flow.close(); }
});

test("a local cleanup failure after remote discard cannot revive Resume", async () => {
  const flow = await pausedBatch();
  try {
    await flow.worker.evaluate(() => {
      const remove = chrome.storage.local.remove.bind(chrome.storage.local);
      globalThis.__qaDiscardRemovalFails = true;
      chrome.storage.local.remove = async keys => {
        if (globalThis.__qaDiscardRemovalFails && [keys].flat().includes("quickvintBatchGenerationRequest")) throw new Error("Controlled local discard cleanup failure");
        return remove(keys);
      };
    });
    await flow.controller.locator(".batch-recovery-discard").click();
    await expect.poll(() => flow.cleanup.length).toBe(1);
    await expect(flow.controller.locator(".batch-title")).toHaveText("Discard not finished");
    await expect(flow.controller.locator(".batch-recovery-resume")).toHaveCount(0);
    await flow.controller.reload();
    await expect(flow.controller.locator(".batch-title")).toHaveText("Discard not finished");
    await expect(flow.controller.locator(".batch-recovery-resume")).toHaveCount(0);
    const saved = (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery;
    expect((await sendFromExtensionContent(flow.context, flow.controller, { type: "RESUME_BATCH_GENERATION", batchId: saved.batchId })).ok).toBe(false);
    expect(flow.requests).toHaveLength(1);
    await flow.worker.evaluate(() => { globalThis.__qaDiscardRemovalFails = false; });
    await flow.controller.locator(".batch-recovery-discard").click();
    await expect(flow.controller.locator("#quickvint-batch-modal")).toHaveCount(0);
  } finally { await flow.close(); }
});

test("completion cleanup failure never turns a generated listing into failed generation", async () => {
  const flow = await openBatchJourney();
  try {
    await flow.context.route("https://autolister.app/api/phone-upload**", route =>
      new URL(route.request().url()).searchParams.get("action") === "cleanup"
        ? route.fulfill({ status: 500, json: { error: "Controlled cleanup failure" } }) : route.fallback());
    await flow.start();
    await expect(flow.controller.locator(".batch-title")).toHaveText("Listings ready");
    const work = flow.context.pages().find(page => page !== flow.controller && page.url().includes("/items/new"));
    await expect(work.locator('[data-testid="media-upload-grid"] img')).toHaveCount(2);
    expect(flow.requests).toHaveLength(1);
    expect(flow.cleanup).toHaveLength(0);
  } finally { await flow.close(); }
});
