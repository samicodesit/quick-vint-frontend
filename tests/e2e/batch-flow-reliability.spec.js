const { test, expect } = require("@playwright/test");
const { openBatchJourney } = require("./batch-journey");

test("batch starts from a usable form while an unrelated image is still loading", async () => {
  const flow = await openBatchJourney({ holdWorkResource: true });
  try {
    await flow.start();
    await expect.poll(() => flow.requests.length).toBe(1).catch(async error => {
      console.log("readiness diagnostic", await flow.worker.evaluate(async () => {
        const job = (await chrome.storage.local.get("quickvintBatchRecovery")).quickvintBatchRecovery;
        return { status: job?.status, message: job?.message, reason: job?.reason, currentWorkTabId: job?.currentWorkTabId };
      }), await Promise.all(flow.context.pages().map(page => page.evaluate(() => ({ url: location.href, state: document.readyState, fileInput: Boolean(document.querySelector('input[type="file"]')) })) )));
      throw error;
    });
    const work = flow.context.pages().find(page => page !== flow.controller && page.url().includes("/items/new"));
    const tab = await flow.worker.evaluate(async sourceTabId => (await chrome.tabs.query({})).find(tab => tab.url?.includes("/items/new") && tab.id !== sourceTabId), flow.sourceTabId);
    expect(tab.status).toBe("loading");
    await expect(work.locator('[data-testid="title--input"]')).toHaveValue("Item 1");
    expect(flow.commits.size).toBe(1);
  } finally { await flow.close(); }
});

test("batch finishes with the controller in front and the work tab hidden", async () => {
  let finishGeneration;
  const generationMayFinish = new Promise(resolve => { finishGeneration = resolve; });
  const flow = await openBatchJourney({ headless: false, realVisibility: true,
    generate: async ({ route, request, commits }) => {
      await generationMayFinish;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(commits.get(request.id)) });
    },
  });
  try {
    await flow.start();
    await expect.poll(() => flow.requests.length).toBe(1);
    await flow.controller.bringToFront();
    const work = flow.context.pages().find(page => page !== flow.controller && page.url().includes("/items/new"));
    // Chrome's real hidden state, not an overridden document getter.
    expect(await work.evaluate(() => document.visibilityState)).toBe("hidden");
    finishGeneration();
    await expect.poll(() => flow.cleanup.length).toBe(1);
    await expect(work.locator('[data-testid="title--input"]')).toHaveValue("Item 1");
    expect(await work.evaluate(() => window.__photoInputChanges)).toBe(1);
    expect(flow.commits.size).toBe(1);
  } finally { finishGeneration(); await flow.close(); }
});

test("batch does not discard source photos or report completion when the host rejects photo injection", async () => {
  const flow = await openBatchJourney({ rejectHostPhotos: true });
  try {
    await flow.start();
    await expect.poll(() => flow.requests.length).toBe(1);
    const work = flow.context.pages().find(page => page !== flow.controller && page.url().includes("/items/new"));
    await work.bringToFront();
    await expect(work.locator('[data-testid="title--input"]')).toHaveValue("Item 1");
    await work.waitForTimeout(1500);
    expect(flow.cleanup).toHaveLength(0);
    const saved = await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"));
    expect(saved.quickvintBatchRecovery.completedCount).toBe(0);
    expect(saved.quickvintBatchRecovery.groups[0]).toHaveLength(2);
  } finally { await flow.close(); }
});

test("batch prepares generated details promptly but only completes after host photo uploads finish", async () => {
  const flow = await openBatchJourney({ hostPhotoDelay: 3500 });
  try {
    await flow.start();
    await expect.poll(() => flow.requests.length, { timeout: 2500 }).toBe(1);
    const work = flow.context.pages().find(page => page !== flow.controller && page.url().includes("/items/new"));
    await expect(work.locator('[data-testid="title--input"]')).toHaveValue("Item 1");
    expect(flow.cleanup).toHaveLength(0);
    expect(flow.requests[0].body.imageUrls).toEqual(flow.files.map(file => file.url));
    await expect.poll(() => flow.cleanup.length).toBe(1);
    expect(await work.locator('.photo-box img').evaluateAll(images => images.every(image => image.src.startsWith("https://images1.vinted.net/") && image.complete && image.naturalWidth > 0))).toBe(true);
    expect(await work.evaluate(() => window.__photoInputChanges)).toBe(1);
  } finally { await flow.close(); }
});

test("opening a batch work tab follows the listing and retains its controller in the background", async () => {
  let finish;
  const mayFinish = new Promise(resolve => { finish = resolve; });
  const flow = await openBatchJourney({ realVisibility: true, headless: false,
    generate: async ({ route, request, commits }) => {
      await mayFinish;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(commits.get(request.id)) });
    },
  });
  try {
    await flow.start();
    await expect.poll(() => flow.requests.length).toBe(1);
    const tabs = await flow.worker.evaluate(() => chrome.tabs.query({ active: true }));
    expect(tabs.map(tab => tab.id)).not.toContain(flow.sourceTabId);
    expect(await flow.controller.evaluate(() => document.visibilityState)).toBe("hidden");
    await expect(flow.controller.locator("#quickvint-batch-modal")).toHaveCount(1);
    finish();
    await expect.poll(() => flow.cleanup.length).toBe(1);
  } finally { finish(); await flow.close(); }
});

for (const recover of [true, false]) {
  test(`a hidden host-field mismatch is explicit waiting and ${recover ? "recovers without regeneration" : "fails only after observed foreground mismatch"}`, async () => {
    let finish;
    const mayFinish = new Promise(resolve => { finish = resolve; });
    const flow = await openBatchJourney({ realVisibility: true, headless: false,
      generate: async ({ route, request, commits }) => {
        await mayFinish;
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(commits.get(request.id)) });
      },
    });
    try {
      await flow.start();
      await expect.poll(() => flow.requests.length).toBe(1);
      const work = flow.context.pages().find(page => page !== flow.controller && page.url().includes("/items/new"));
      await work.evaluate(() => {
        const title = document.querySelector('[data-testid="title--input"]');
        window.rejectFixtureTitle = () => { title.value = "Host has not accepted the generated title"; };
        title.addEventListener("input", window.rejectFixtureTitle);
      });
      await flow.controller.bringToFront();
      expect(await work.evaluate(() => document.visibilityState)).toBe("hidden");
      finish();
      await expect(work.locator('[data-testid="title--input"]')).toHaveValue("Host has not accepted the generated title");
      await expect(work.locator("#quickvint-batch-tab-status")).toContainText("Open this listing tab", { timeout: 9000 });
      expect(flow.cleanup).toHaveLength(0);
      await flow.worker.evaluate(() => AutoListerBackgroundTelemetry.flush());
      expect(flow.events.some(event => event.event === "batch_worker_waiting" && event.context.reason === "host_fields_hidden" && event.context.generationAttemptId === flow.requests[0].body.generationAttemptId)).toBe(true);
      if (recover) {
        await work.evaluate(() => {
          const title = document.querySelector('[data-testid="title--input"]');
          title.removeEventListener("input", window.rejectFixtureTitle);
          title.value = "Item 1";
        });
        await expect.poll(() => flow.cleanup.length).toBe(1);
      } else {
        await work.bringToFront();
        await expect(flow.controller.locator(".batch-recovery-resume")).toBeVisible();
        const recovery = await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"));
        expect(recovery.quickvintBatchRecovery.completedCount).toBe(0);
        expect(recovery.quickvintBatchRecovery.groups[0]).toHaveLength(2);
        expect(flow.cleanup).toHaveLength(0);
      }
      expect(flow.requests).toHaveLength(1);
      expect(flow.commits.size).toBe(1);
    } finally { finish(); await flow.close(); }
  });
}

test("a delayed host field rewrite cannot turn a rejected result into completed cleanup", async () => {
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
    await work.evaluate(() => {
      const title = document.querySelector('[data-testid="title--input"]');
      title.addEventListener('input', () => setTimeout(() => { title.value = 'Host restored its previous value'; }, 100));
    });
    finish();
    await expect(work.locator('[data-testid="title--input"]')).toHaveValue('Host restored its previous value');
    await expect(flow.controller.locator('.batch-recovery-resume')).toBeVisible();
    expect(flow.cleanup).toHaveLength(0);
    expect(flow.requests).toHaveLength(1);
    const state = await flow.worker.evaluate(() => chrome.storage.local.get(['quickvintBatchRecovery', 'quickvintBatchGenerationRequest']));
    expect(state.quickvintBatchRecovery.completedCount).toBe(0);
    expect(state.quickvintBatchGenerationRequest.requestId).toBe(flow.requests[0].id);
  } finally { finish(); await flow.close(); }
});
