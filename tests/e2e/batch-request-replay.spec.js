const { test, expect } = require("@playwright/test");
const { openBatchJourney, sendFromExtensionContent } = require("./batch-journey");

test("a committed generation whose responses were lost replays its exact request in a new work tab", async () => {
  let allowReplay = false;
  const flow = await openBatchJourney({ refreshUrls: true,
    generate: async ({ route, request, requests, commits }) => {
      if (!allowReplay) return route.abort("connectionreset");
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(commits.get(request.id)) });
    },
  });
  try {
    await flow.start();
    await expect.poll(() => flow.requests.length).toBeGreaterThanOrEqual(2);
    const recovery = await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"));
    await sendFromExtensionContent(flow.context, flow.controller, { type: "STOP_BATCH_GENERATION", batchId: recovery.quickvintBatchRecovery.batchId });
    await expect(flow.controller.locator(".batch-recovery-resume")).toBeVisible();
    const firstWork = flow.context.pages().find(page => page !== flow.controller && page.url().includes("/items/new"));
    const beforeResume = flow.requests.length;
    allowReplay = true;
    await flow.controller.locator(".batch-recovery-resume").click();
    await expect.poll(() => flow.requests.length).toBe(beforeResume + 1);
    expect(flow.requests[beforeResume].id).toBe(flow.requests[0].id);
    expect(flow.requests[beforeResume].rawBody).toBe(flow.requests[0].rawBody);
    expect(flow.commits.size).toBe(1);
    expect(flow.context.pages().filter(page => page !== flow.controller && page.url().includes("/items/new"))).toHaveLength(2);
    expect(firstWork.isClosed()).toBe(false);
    await expect.poll(() => flow.cleanup.length).toBe(1);
  } finally { await flow.close(); }
});

test("a failed durable request checkpoint never sends a generation or cleans up photos", async () => {
  const flow = await openBatchJourney();
  try {
    await flow.worker.evaluate(() => {
      const save = chrome.storage.local.set.bind(chrome.storage.local);
      chrome.storage.local.set = async values => {
        if (values.quickvintBatchGenerationRequest) throw new Error("Controlled local checkpoint failure");
        return save(values);
      };
    });
    await flow.start();
    await expect(flow.controller.locator(".batch-recovery-resume")).toBeVisible();
    expect(flow.requests).toHaveLength(0);
    expect(flow.cleanup).toHaveLength(0);
    const recovery = await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"));
    expect(recovery.quickvintBatchRecovery.completedCount).toBe(0);
    expect(recovery.quickvintBatchRecovery.groups[0]).toHaveLength(2);
  } finally { await flow.close(); }
});

test("another tab cannot confirm completion or clear the active generation request", async () => {
  let finish;
  const mayFinish = new Promise(resolve => { finish = resolve; });
  const flow = await openBatchJourney({ generate: async ({ route, request, commits }) => {
    await mayFinish;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(commits.get(request.id)) });
  } });
  try {
    await flow.start();
    await expect.poll(() => flow.requests.length).toBe(1);
    const before = await flow.worker.evaluate(() => chrome.storage.local.get(["quickvintBatchRecovery", "quickvintBatchGenerationRequest"]));
    const response = await sendFromExtensionContent(flow.context, flow.controller, { type: "MARK_BATCH_ITEM_COMPLETE", batchId: before.quickvintBatchRecovery.batchId, itemIndex: 1 });
    expect(response.ok).toBe(false);
    const after = await flow.worker.evaluate(() => chrome.storage.local.get(["quickvintBatchRecovery", "quickvintBatchGenerationRequest"]));
    expect(after.quickvintBatchRecovery.completedCount).toBe(0);
    expect(after.quickvintBatchGenerationRequest.requestId).toBe(before.quickvintBatchGenerationRequest.requestId);
    expect(flow.cleanup).toHaveLength(0);
    finish();
    await expect.poll(() => flow.cleanup.length).toBe(1);
  } finally { finish(); await flow.close(); }
});

test("switching accounts during generation preserves the original account request and does not apply its result", async () => {
  let finish;
  const mayFinish = new Promise(resolve => { finish = resolve; });
  const flow = await openBatchJourney({ generate: async ({ route, request, commits }) => {
    await mayFinish;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(commits.get(request.id)) });
  } });
  try {
    await flow.start();
    await expect.poll(() => flow.requests.length).toBe(1);
    const work = flow.context.pages().find(page => page !== flow.controller && page.url().includes("/items/new"));
    await flow.worker.evaluate(async () => {
      const { supabaseSession } = await chrome.storage.local.get("supabaseSession");
      await chrome.storage.local.set({ supabaseSession: { ...supabaseSession, access_token: "different-local-token", user: { id: "different-account", email: "other@example.invalid" } } });
    });
    finish();
    await expect.poll(async () => (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery.status).toBe("paused");
    await expect(work.locator('[data-testid="title--input"]')).toHaveValue("");
    expect(flow.cleanup).toHaveLength(0);
    const saved = await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchGenerationRequest"));
    expect(saved.quickvintBatchGenerationRequest.accountId).toBe("test-user");
    expect(saved.quickvintBatchGenerationRequest.requestId).toBe(flow.requests[0].id);
    await flow.worker.evaluate(() => AutoListerTelemetry.flush());
    expect(flow.eventRequests.filter(request => request.accountToken === "Bearer different-local-token")
      .flatMap(request => request.events).some(event => event.context?.generationAttemptId === flow.requests[0].body.generationAttemptId)).toBe(false);
  } finally { finish(); await flow.close(); }
});

test("an account switch while host photos are pending cannot falsely complete the batch", async () => {
  const flow = await openBatchJourney({ hostPhotoDelay: 3500 });
  try {
    await flow.start();
    await expect.poll(() => flow.requests.length).toBe(1);
    const work = flow.context.pages().find(page => page !== flow.controller && page.url().includes("/items/new"));
    await expect(work.locator('[data-testid="title--input"]')).toHaveValue("Item 1");
    await flow.worker.evaluate(async () => {
      const { supabaseSession } = await chrome.storage.local.get("supabaseSession");
      await chrome.storage.local.set({ supabaseSession: { ...supabaseSession, access_token: "different-host-wait-token", user: { id: "different-account", email: "other@example.invalid" } } });
    });
    await expect.poll(async () => (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery?.status).toBe("paused");
    expect(flow.cleanup).toHaveLength(0);
    const saved = await flow.worker.evaluate(() => chrome.storage.local.get(["quickvintBatchRecovery", "quickvintBatchGenerationRequest"]));
    expect(saved.quickvintBatchRecovery.completedCount).toBe(0);
    expect(saved.quickvintBatchGenerationRequest.accountId).toBe("test-user");
    await flow.controller.waitForTimeout(4000);
    await flow.worker.evaluate(() => AutoListerTelemetry.flush());
    expect(flow.eventRequests.filter(request => request.accountToken === "Bearer different-host-wait-token")
      .flatMap(request => request.events).some(event => event.context?.operationId === flow.requests[0].body.generationAttemptId)).toBe(false);
  } finally { await flow.close(); }
});

test("an expired request from an older batch cannot block a new batch", async () => {
  const flow = await openBatchJourney();
  try {
    await flow.worker.evaluate(() => chrome.storage.local.set({ quickvintBatchGenerationRequest: {
      accountId: "older-account", batchId: "expired-batch", itemIndex: 1,
      requestId: "expired-request", requestBodyJson: "{}", createdAt: Date.now() - 7 * 3600_000, expiresAt: Date.now() - 1,
    } }));
    await flow.start();
    await expect.poll(() => flow.requests.length).toBe(1);
    await expect.poll(() => flow.cleanup.length).toBe(1);
    expect(flow.commits.size).toBe(1);
  } finally { await flow.close(); }
});

test("signed-out and different accounts cannot read, focus, resume or discard saved batch recovery", async () => {
  const flow = await openBatchJourney({ generate: ({ route }) => route.fulfill({
    status: 400, contentType: "application/json", body: JSON.stringify({ error: "Local invalid image fixture" }),
  }) });
  try {
    await flow.start();
    await expect(flow.controller.locator(".batch-recovery-resume")).toBeVisible();
    const original = await flow.worker.evaluate(() => chrome.storage.local.get(["supabaseSession", "quickvintBatchRecovery", "quickvintBatchGenerationRequest"]));
    const work = flow.context.pages().find(page => page !== flow.controller && page.url().includes("/items/new"));
    for (const userId of [null, "other-local-account"]) {
      await flow.worker.evaluate(async ({ session, userId }) => {
        if (!userId) await chrome.storage.local.remove("supabaseSession");
        else await chrome.storage.local.set({ supabaseSession: { ...session, user: { id: userId } } });
      }, { session: original.supabaseSession, userId });
      await expect(flow.controller.locator("#quickvint-batch-modal")).toHaveCount(0);
      const recovery = await sendFromExtensionContent(flow.context, flow.controller, { type: "GET_BATCH_RECOVERY" });
      expect(recovery.recovery).toBeNull();
      expect(recovery.batchId).toBeUndefined();
      const heartbeat = await sendFromExtensionContent(flow.context, flow.controller, { type: "QUICKVINT_TAB_JOB_HEARTBEAT", kind: "batch" });
      expect(heartbeat.active).toBe(false);
      expect(heartbeat.recovery).toBeUndefined();
      expect((await sendFromExtensionContent(flow.context, work, { type: "FOCUS_BATCH_RECOVERY" })).ok).toBe(false);
      expect((await sendFromExtensionContent(flow.context, flow.controller, { type: "RESUME_BATCH_GENERATION", batchId: original.quickvintBatchRecovery.batchId })).ok).toBe(false);
      expect((await sendFromExtensionContent(flow.context, flow.controller, { type: "DISCARD_BATCH_RECOVERY", batchId: original.quickvintBatchRecovery.batchId })).ok).toBe(false);
      const saved = await flow.worker.evaluate(() => chrome.storage.local.get(["quickvintBatchRecovery", "quickvintBatchGenerationRequest"]));
      expect(saved.quickvintBatchRecovery).toEqual(original.quickvintBatchRecovery);
      expect(saved.quickvintBatchGenerationRequest).toEqual(original.quickvintBatchGenerationRequest);
      expect(flow.cleanup).toHaveLength(0);
    }
    await flow.worker.evaluate(session => chrome.storage.local.set({ supabaseSession: session }), original.supabaseSession);
    expect((await sendFromExtensionContent(flow.context, flow.controller, { type: "GET_BATCH_RECOVERY" })).recovery.batchId).toBe(original.quickvintBatchRecovery.batchId);
    expect((await sendFromExtensionContent(flow.context, flow.controller, { type: "DISCARD_BATCH_RECOVERY", batchId: original.quickvintBatchRecovery.batchId })).ok).toBe(true);
    await expect.poll(() => flow.cleanup.length).toBe(1);
  } finally { await flow.close(); }
});

test("a new batch and stale recovery controls cannot replace or discard an unfinished saved batch", async () => {
  const flow = await openBatchJourney({ generate: ({ route }) => route.fulfill({ status: 400, json: { error: 'Local invalid input' } }) });
  try {
    await flow.start();
    await expect(flow.controller.locator('.batch-recovery-resume')).toBeVisible();
    const before = await flow.worker.evaluate(() => chrome.storage.local.get(['quickvintBatchRecovery', 'quickvintBatchGenerationRequest']));
    for (const type of ['DISCARD_BATCH_RECOVERY', 'RESUME_BATCH_GENERATION']) {
      expect((await sendFromExtensionContent(flow.context, flow.controller, { type, batchId: 'a-stale-different-batch' })).ok).toBe(false);
    }
    const start = { type: 'START_BATCH_GENERATION', sessionId: 'another-upload', inputSource: 'phone', groups: [flow.files] };
    expect((await sendFromExtensionContent(flow.context, flow.controller, start)).ok).toBe(false);
    await flow.worker.evaluate(async () => {
      const { supabaseSession } = await chrome.storage.local.get('supabaseSession');
      await chrome.storage.local.set({ supabaseSession: { ...supabaseSession, user: { id: 'another-account' } } });
    });
    const foreign = await sendFromExtensionContent(flow.context, flow.controller, start);
    expect(foreign.ok).toBe(false);
    expect(foreign.recovery).toBeUndefined();
    const after = await flow.worker.evaluate(() => chrome.storage.local.get(['quickvintBatchRecovery', 'quickvintBatchGenerationRequest']));
    expect(after).toEqual(before);
    expect(flow.requests).toHaveLength(1);
    expect(flow.cleanup).toHaveLength(0);
  } finally { await flow.close(); }
});

test("a temporary saved-photo check failure does not falsely expire a recoverable batch", async () => {
  const flow = await openBatchJourney({ generate: ({ route }) => route.fulfill({ status: 400, json: { error: 'Local invalid input' } }) });
  try {
    await flow.start();
    await expect(flow.controller.locator('.batch-recovery-resume')).toBeVisible();
    await flow.context.route('https://autolister.app/api/phone-upload**', route => {
      const url = new URL(route.request().url());
      return route.request().method() === 'GET' && url.searchParams.get('includeUrls') === '1'
        ? route.fulfill({ status: 503, json: { error: 'Controlled temporary metadata outage' } }) : route.fallback();
    });
    await flow.controller.locator('.batch-recovery-resume').click();
    await expect.poll(async () => (await flow.worker.evaluate(() => chrome.storage.local.get('quickvintBatchRecovery'))).quickvintBatchRecovery.reason).toBe('recovery_check_failed');
    await expect(flow.controller.locator('.batch-recovery-resume')).toBeVisible();
    const saved = await flow.worker.evaluate(() => chrome.storage.local.get(['quickvintBatchRecovery', 'quickvintBatchGenerationRequest']));
    expect(saved.quickvintBatchRecovery.status).toBe('paused');
    expect(saved.quickvintBatchRecovery.reason).toBe('recovery_check_failed');
    expect(saved.quickvintBatchRecovery.groups[0]).toHaveLength(2);
    expect(saved.quickvintBatchGenerationRequest.requestId).toBe(flow.requests[0].id);
    expect(flow.requests).toHaveLength(1);
    expect(flow.cleanup).toHaveLength(0);
  } finally { await flow.close(); }
});
