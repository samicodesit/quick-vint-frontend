const { test, expect } = require("@playwright/test");
const { openBatchJourney } = require("./batch-journey");

async function prepare(page, count = 2) {
  await page.bringToFront();
  await page.locator("#quickvint-phone-btn").click();
  await page.locator(".quickvint-upload-choice-multiple").click();
  await expect(page.locator(".batch-photo")).toHaveCount(count);
  for (const photo of await page.locator(".batch-gallery .batch-photo").all()) await photo.click();
  await page.locator(".batch-mark-group").click();
}

test("the local batch fixture supports real SDK session restoration", async () => {
  const flow = await openBatchJourney();
  try {
    const restored = await flow.worker.evaluate(() => refreshTokenWithRetry(1,
      { entryPoint: "startup_restore", restoreOnly: true }));
    expect(restored?.user?.id).toBe("test-user");
    expect(restored.expires_at * 1000).toBeGreaterThan(Date.now() + 300000);
    expect(flow.requests).toHaveLength(0);
  } finally { await flow.close(); }
});

test("a closed completed controller cannot strand a fresh batch setup", async () => {
  let release;
  const held = new Promise(resolve => { release = resolve; });
  const flow = await openBatchJourney({ generate: async ({ route, request, requests, commits }) => {
    if (requests.length === 1) await held;
    return route.fulfill({ json: commits.get(request.id) });
  } });
  try {
    await flow.start();
    await expect.poll(() => flow.requests.length).toBe(1);
    await flow.controller.close();
    release();
    await expect.poll(() => flow.cleanup.length).toBe(1);
    const fresh = await flow.context.newPage();
    await fresh.goto("https://www.vinted.com/items/new", { waitUntil: "domcontentloaded" });
    await expect(fresh.locator("#quickvint-phone-btn")).toBeVisible();
    await prepare(fresh);
    await fresh.locator(".batch-start").click();
    await expect(fresh.locator(".batch-title")).toHaveText("Listings ready");
    expect(flow.requests).toHaveLength(2);
    const work = flow.context.pages().filter(page => page !== fresh && page.url().includes("/items/new"));
    expect(work).toHaveLength(2);
    for (const page of work) expect(await page.locator('input[type="file"]').evaluate(input => input.files.length)).toBe(2);
  } finally { release(); await flow.close(); }
});

for (const deliver of [true, false]) test(`a later batch preserves earlier ${deliver ? "delayed" : "undelivered"} completion and Done`, async () => {
  let releaseSecond;
  const heldSecond = new Promise(resolve => { releaseSecond = resolve; });
  const flow = await openBatchJourney({ realVisibility: true, generate: async ({ route, request, requests, commits }) => {
    if (requests.length === 2) await heldSecond;
    return route.fulfill({ json: commits.get(request.id) });
  } });
  try {
    await flow.worker.evaluate(() => chrome.storage.local.set({ "quickvintBatchReviewPrompt:test-user": { snoozedAt: Date.now() } }));
    await flow.worker.evaluate(() => {
      const run = runBatchGenerationJob;
      runBatchGenerationJob = async job => {
        try { return await run(job); }
        finally { if (job.batchId === globalThis.__qaHeldBatch) globalThis.__qaFirstSettled = true; }
      };
      const send = chrome.tabs.sendMessage.bind(chrome.tabs);
      const gate = new Promise(resolve => { globalThis.__qaReleaseDone = resolve; });
      chrome.tabs.sendMessage = async (id, message, ...rest) => {
        if (message.type === "BATCH_PROGRESS" && message.status === "done") {
          globalThis.__qaHeldBatch ||= message.batchId;
          if (message.batchId === globalThis.__qaHeldBatch) await gate;
        }
        return send(id, message, ...rest);
      };
    });
    const second = await flow.context.newPage();
    await second.goto("https://www.vinted.com/items/new", { waitUntil: "domcontentloaded" });
    await expect(second.locator("#quickvint-phone-btn")).toBeVisible();
    await prepare(second);
    await flow.controller.bringToFront();
    await flow.start();
    await expect.poll(() => flow.worker.evaluate(() => globalThis.__qaFirstSettled)).toBe(true);
    await second.bringToFront();
    await second.locator(".batch-start").click();
    await expect.poll(() => flow.requests.length).toBe(2);
    if (deliver) await flow.worker.evaluate(() => globalThis.__qaReleaseDone());
    await flow.controller.bringToFront();
    await expect(flow.controller.locator(".batch-title")).toHaveText("Listings ready");
    await flow.controller.locator(".batch-dismiss").click();
    await expect(flow.controller.locator("#quickvint-batch-modal")).toHaveCount(0);
    const active = (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery;
    expect(active.status).toBe("running");
    releaseSecond();
    await expect(second.locator(".batch-title")).toHaveText("Listings ready");
    expect(flow.requests).toHaveLength(2);
    await flow.worker.evaluate(() => AutoListerBackgroundTelemetry.flush());
    expect(flow.events.some(event => event.event === "batch_failed")).toBe(false);
  } finally {
    if (test.info().status !== test.info().expectedStatus) {
      const diagnostic = await flow.worker.evaluate(async () => {
        const session = await getStoredSession();
        return { sessionPresent: Boolean(session), expiryInMs: session?.expires_at * 1000 - Date.now(),
          refreshInFlight: Boolean(tokenRefreshPromise), activeJobStatus: activeTabJob?.status };
      }).catch(error => ({ workerReadError: error.message }));
      diagnostic.controller = await flow.controller.evaluate(() => ({ visibility: document.visibilityState,
        button: document.querySelector("#quickvint-phone-btn")?.textContent,
        choices: document.querySelectorAll(".quickvint-upload-choice-multiple").length })).catch(() => null);
      diagnostic.unexpected = flow.unexpected;
      await test.info().attach("batch-routing-state", { body: JSON.stringify(diagnostic), contentType: "application/json" });
    }
    releaseSecond();
    await flow.worker.evaluate(() => globalThis.__qaReleaseDone?.()).catch(() => {});
    await flow.close();
  }
});
