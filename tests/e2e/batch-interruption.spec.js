const { test, expect } = require("@playwright/test");
const { openBatchJourney, sendFromExtensionContent } = require("./batch-journey");

test("an interrupted source-photo download waits and retries only the missing photo automatically", async () => {
  const flow = await openBatchJourney();
  let online = false;
  let attempts = 0;
  let otherDownloads = 0;
  try {
    await flow.context.route('https://storage.test/photo-0.png', route => {
      if (route.request().resourceType() !== 'fetch') return route.fallback();
      attempts++;
      return online ? route.fallback() : route.abort('connectionreset');
    });
    await flow.context.route('https://storage.test/photo-1.png', route => {
      if (route.request().resourceType() === 'fetch') otherDownloads++;
      return route.fallback();
    });
    await flow.start();
    await expect(flow.controller.locator('.batch-status')).toContainText('Waiting to download photos');
    await expect(flow.controller.locator('.batch-progress-count')).toHaveText('Waiting');
    expect(flow.requests).toHaveLength(0);
    expect(flow.cleanup).toHaveLength(0);
    expect(await flow.controller.locator('.batch-recovery-resume').count()).toBe(0);
    expect((await flow.restartWorker()).active).toBe(true);
    await expect(flow.controller.locator('.batch-status')).toContainText('Waiting to download photos');
    online = true;
    await expect.poll(() => flow.cleanup.length).toBe(1);
    expect(attempts).toBeGreaterThan(1);
    expect(otherDownloads).toBe(1);
    expect(flow.requests).toHaveLength(1);
    const work = flow.context.pages().find(p => p !== flow.controller && p.url().includes('/items/new'));
    expect(await work.evaluate(() => window.__photoInputChanges)).toBe(1);
    expect(await work.locator('input[type=file]').evaluate(el => el.files.length)).toBe(2);
  } finally { await flow.close(); }
});

test("persistent source-photo loss reaches its retry deadline without generating", async () => {
  const flow = await openBatchJourney();
  try {
    await flow.context.route('https://storage.test/photo-0.png', route =>
      route.request().resourceType() === 'fetch' ? route.abort('connectionreset') : route.fallback());
    await flow.start();
    await expect(flow.controller.locator('.batch-status')).toContainText('Waiting to download photos');
    const work = flow.context.pages().find(p => p !== flow.controller && p.url().includes('/items/new'));
    const cdp = await flow.context.newCDPSession(work);
    const worlds = [];
    cdp.on('Runtime.executionContextCreated', ({ context }) => worlds.push(context));
    try {
      await cdp.send('Runtime.enable');
      let advanced = false;
      for (const world of worlds.filter(w => !w.auxData?.isDefault)) {
        const probe = await cdp.send('Runtime.evaluate', { contextId: world.id, expression: 'Boolean(globalThis.chrome?.runtime?.id)', returnByValue: true });
        if (!probe.result.value) continue;
        // Actual failed photo fetch, controlled elapsed clock for the bounded
        // two-minute boundary. This does not simulate a historical root cause.
        await cdp.send('Runtime.evaluate', { contextId: world.id, expression: 'Date.now = ((now) => () => now() + 121000)(Date.now)' });
        advanced = true; break;
      }
      expect(advanced).toBe(true);
    } finally { await cdp.detach(); }
    await expect(flow.controller.locator('.batch-recovery-resume')).toBeVisible();
    await expect(flow.controller.locator('.batch-status')).toContainText('connection was unavailable');
    expect(flow.requests).toHaveLength(0);
    expect(flow.cleanup).toHaveLength(0);
    expect((await flow.worker.evaluate(() => chrome.storage.local.get('quickvintBatchRecovery'))).quickvintBatchRecovery.groups[0]).toHaveLength(2);
  } finally { await flow.close(); }
});

test("source-photo retry respects Retry-After before continuing", async () => {
  const flow = await openBatchJourney();
  const times = [];
  try {
    await flow.context.route('https://storage.test/photo-0.png', route => {
      if (route.request().resourceType() !== 'fetch') return route.fallback();
      times.push(Date.now());
      return times.length === 1
        ? route.fulfill({ status: 429, headers: { 'Retry-After': '1', 'Access-Control-Expose-Headers': 'Retry-After' }, body: 'Slow down' }) : route.fallback();
    });
    await flow.start();
    await expect.poll(() => flow.cleanup.length).toBe(1);
    expect(times).toHaveLength(2);
    expect(times[1] - times[0]).toBeGreaterThanOrEqual(950);
    expect(flow.requests).toHaveLength(1);
  } finally { await flow.close(); }
});

test("a definitively unavailable source photo pauses without generating or deleting photos", async () => {
  const flow = await openBatchJourney();
  let attempts = 0;
  try {
    await flow.context.route('https://storage.test/photo-0.png', route => {
      if (route.request().resourceType() !== 'fetch') return route.fallback();
      attempts++; return route.fulfill({ status: 404, body: 'Missing photo' });
    });
    await flow.start();
    await expect(flow.controller.locator('.batch-recovery-resume')).toBeVisible();
    expect(attempts).toBe(1);
    expect(flow.requests).toHaveLength(0);
    expect(flow.cleanup).toHaveLength(0);
    const saved = await flow.worker.evaluate(() => chrome.storage.local.get('quickvintBatchRecovery'));
    expect(saved.quickvintBatchRecovery.groups[0]).toHaveLength(2);
  } finally { await flow.close(); }
});

test("stopping persistent source-photo connection loss cancels retries and retains the batch", async () => {
  const flow = await openBatchJourney();
  let attempts = 0;
  try {
    await flow.context.route('https://storage.test/photo-0.png', route => {
      if (route.request().resourceType() !== 'fetch') return route.fallback();
      attempts++; return route.abort('connectionreset');
    });
    await flow.start();
    await expect(flow.controller.locator('.batch-status')).toContainText('Waiting to download photos');
    const saved = await flow.worker.evaluate(() => chrome.storage.local.get('quickvintBatchRecovery'));
    expect((await sendFromExtensionContent(flow.context, flow.controller, {
      type: 'STOP_BATCH_GENERATION', batchId: saved.quickvintBatchRecovery.batchId,
    })).ok).toBe(true);
    await expect(flow.controller.locator('.batch-recovery-resume')).toBeVisible();
    const count = attempts;
    await flow.controller.waitForTimeout(1700);
    expect(attempts).toBe(count);
    expect(flow.requests).toHaveLength(0);
    expect(flow.cleanup).toHaveLength(0);
    expect((await flow.worker.evaluate(() => chrome.storage.local.get('quickvintBatchRecovery'))).quickvintBatchRecovery.groups[0]).toHaveLength(2);
  } finally { await flow.close(); }
});

test("a restarted worker reattaches to the running content item without reinjecting photos", async () => {
  let finish;
  const mayFinish = new Promise(resolve => { finish = resolve; });
  const flow = await openBatchJourney({ groupSizes: [1, 1], generate: async ({ route, request, commits }) => {
    await mayFinish;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(commits.get(request.id)) });
  } });
  try {
    await flow.start();
    await expect.poll(() => flow.requests.length).toBe(1);
    const work = flow.context.pages().find(page => page !== flow.controller && page.url().includes("/items/new"));
    const before = await work.evaluate(() => window.__photoInputChanges);
    const response = await flow.restartWorker();
    expect(response.active).toBe(true);
    finish();
    await expect.poll(() => flow.cleanup.length).toBe(1);
    expect(flow.requests).toHaveLength(2);
    expect(flow.commits.size).toBe(2);
    expect(await work.evaluate(() => window.__photoInputChanges)).toBe(before);
    expect(flow.context.pages().filter(page => page.url().includes("/items/new"))).toHaveLength(3);
    await flow.worker.evaluate(() => AutoListerTelemetry.flush());
    expect(flow.events.some(event => event.event === 'batch_worker_progress' && event.context.phase === 'worker_reattached' &&
      event.context.generationAttemptId === flow.requests[0].body.generationAttemptId)).toBe(true);
  } finally { finish(); await flow.close(); }
});

test("a brief generation connection loss waits and recovers automatically using the same exact payload", async () => {
  let online = false;
  const flow = await openBatchJourney({ generate: async ({ route, request, commits }) => {
    if (!online) return route.abort("connectionreset");
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(commits.get(request.id)) });
  } });
  try {
    await flow.start();
    await expect.poll(() => flow.requests.length).toBeGreaterThanOrEqual(2);
    await expect(flow.controller.locator(".batch-status")).toContainText("connection");
    await expect(flow.controller.locator(".batch-progress-count")).toHaveText("Waiting");
    await expect(flow.controller.locator(".batch-progress-badge")).toHaveText("Waiting for connection");
    expect(await flow.controller.locator(".batch-recovery-resume").count()).toBe(0);
    online = true;
    await expect.poll(() => flow.cleanup.length).toBe(1);
    expect(new Set(flow.requests.map(request => request.id)).size).toBe(1);
    expect(new Set(flow.requests.map(request => request.rawBody)).size).toBe(1);
    expect(flow.commits.size).toBe(1);
  } finally { await flow.close(); }
});

test("a server still committing its result shows honest waiting and replays one request", async () => {
  let ready = false;
  const flow = await openBatchJourney({ generate: ({ route, request, commits }) => ready
    ? route.fulfill({ json: commits.get(request.id) })
    : route.fulfill({ status: 503, headers: { "Retry-After": "1" }, json: { code: "generation_commit_pending", error: "Still finishing" } }) });
  try {
    await flow.start();
    await expect(flow.controller.locator('.batch-status')).toContainText('still finishing');
    await expect(flow.controller.locator('.batch-progress-count')).toHaveText('Waiting');
    await expect(flow.controller.locator('.batch-progress-badge')).toHaveText('Finishing generation');
    ready = true;
    await expect.poll(() => flow.cleanup.length).toBe(1);
    expect(new Set(flow.requests.map(request => request.id)).size).toBe(1);
    expect(new Set(flow.requests.map(request => request.rawBody)).size).toBe(1);
    expect(flow.commits.size).toBe(1);
  } finally { await flow.close(); }
});

test("stopping a connection wait retains photos and blocks late completion until explicit resume", async () => {
  const flow = await openBatchJourney({ generate: ({ route }) => route.abort("connectionreset") });
  try {
    await flow.start();
    await expect.poll(() => flow.requests.length).toBeGreaterThanOrEqual(2);
    const saved = await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"));
    const response = await sendFromExtensionContent(flow.context, flow.controller, { type: "STOP_BATCH_GENERATION", batchId: saved.quickvintBatchRecovery.batchId });
    expect(response.ok).toBe(true);
    await expect(flow.controller.locator(".batch-recovery-resume")).toBeVisible();
    const count = flow.requests.length;
    await flow.controller.waitForTimeout(1600);
    expect(flow.requests).toHaveLength(count);
    expect(flow.cleanup).toHaveLength(0);
    const after = await flow.worker.evaluate(() => chrome.storage.local.get(["quickvintBatchRecovery", "quickvintBatchGenerationRequest"]));
    expect(after.quickvintBatchRecovery.groups[0]).toHaveLength(2);
    expect(after.quickvintBatchGenerationRequest.requestId).toBe(flow.requests[0].id);
    const work = flow.context.pages().find(page => page !== flow.controller && page.url().includes('/items/new'));
    const staleWait = await sendFromExtensionContent(flow.context, work, {
      type: 'BATCH_ITEM_WAITING', batchId: saved.quickvintBatchRecovery.batchId, itemIndex: 1,
      generationAttemptId: flow.requests[0].body.generationAttemptId, reason: 'network_wait', message: 'Late network status',
    });
    expect(staleWait.ok).toBe(false);
    await flow.worker.evaluate(() => AutoListerTelemetry.flush());
    expect(flow.events.some(event => event.event === 'batch_cancelled' && event.context.reason === 'user_stopped')).toBe(true);
    expect(flow.events.some(event => ['generate_error', 'batch_paused'].includes(event.event))).toBe(false);
    expect(await work.locator('#quickvint-batch-recovery-nudge').count()).toBe(0);
  } finally { await flow.close(); }
});

test("closing a listing tab pauses safely and explicit resume replays the saved result", async () => {
  const flow = await openBatchJourney({ hostPhotoDelay: 3500 });
  try {
    await flow.start();
    await expect.poll(() => flow.requests.length).toBe(1);
    const work = flow.context.pages().find(page => page !== flow.controller && page.url().includes("/items/new"));
    await expect(work.locator('[data-testid="title--input"]')).toHaveValue("Item 1");
    await work.close();
    await expect(flow.controller.locator(".batch-recovery-resume")).toBeVisible();
    expect(flow.context.pages().filter(page => page.url().includes("/items/new"))).toHaveLength(1);
    expect(flow.cleanup).toHaveLength(0);
    await flow.controller.locator(".batch-recovery-resume").click();
    await expect.poll(() => flow.requests.length).toBe(2);
    expect(flow.requests[1].id).toBe(flow.requests[0].id);
    expect(flow.requests[1].rawBody).toBe(flow.requests[0].rawBody);
    await expect.poll(() => flow.cleanup.length).toBe(1);
    expect(flow.commits.size).toBe(1);
  } finally { await flow.close(); }
});

test("an explicit host upload rejection stops promptly without losing source photos", async () => {
  const flow = await openBatchJourney({ rejectHostPhotos: true, hostRejectMessage: "Local host rejected this photo" });
  try {
    await flow.start();
    await expect.poll(() => flow.requests.length).toBe(1);
    await expect(flow.controller.locator(".batch-recovery-resume")).toBeVisible();
    const saved = await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"));
    expect(saved.quickvintBatchRecovery.completedCount).toBe(0);
    expect(saved.quickvintBatchRecovery.groups[0]).toHaveLength(2);
    expect(saved.quickvintBatchRecovery.message).toContain("Vinted");
    expect(flow.cleanup).toHaveLength(0);
    expect(flow.requests).toHaveLength(1);
  } finally { await flow.close(); }
});

test("an informational host notice does not fail a batch with confirmed photos", async () => {
  const flow = await openBatchJourney({ hostNoticeMessage: "You can add more photos" });
  try {
    await flow.start();
    await expect.poll(() => flow.cleanup.length).toBe(1);
    expect(flow.requests).toHaveLength(1);
    expect(flow.commits.size).toBe(1);
    await expect.poll(async () => {
      await flow.worker.evaluate(() => AutoListerTelemetry.flush());
      return flow.events.some(event => event.event === "photos_confirmed");
    }).toBe(true);
    expect(flow.events.some(event => event.event === "host_photos_rejected")).toBe(false);
  } finally { await flow.close(); }
});

test("a worker restart preserves connection-wait guidance and the existing item request", async () => {
  let online = false;
  const flow = await openBatchJourney({ generate: ({ route, request, commits }) => online
    ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(commits.get(request.id)) })
    : route.abort('connectionreset') });
  try {
    await flow.start();
    await expect(flow.controller.locator('.batch-status')).toContainText('connection');
    expect((await flow.restartWorker()).active).toBe(true);
    await expect(flow.controller.locator('.batch-status')).toContainText('connection');
    await expect(flow.controller.locator('.batch-progress-count')).toHaveText('Waiting');
    await expect(flow.controller.locator('.batch-progress-badge')).toHaveText('Waiting for connection');
    online = true;
    await expect.poll(() => flow.cleanup.length).toBe(1);
    expect(new Set(flow.requests.map(request => request.id)).size).toBe(1);
    expect(flow.commits.size).toBe(1);
  } finally { await flow.close(); }
});
