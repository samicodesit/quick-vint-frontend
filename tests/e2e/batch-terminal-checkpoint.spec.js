const { test, expect } = require("@playwright/test");
const { openBatchJourney, sendFromExtensionContent } = require("./batch-journey");

for (const failure of ["final-write-once", "terminal-remove", "request-remove-once"]) {
  test(`completed batch stays complete after ${failure}, reload and a new start`, async () => {
    const flow = await openBatchJourney();
    let completionAtCleanup;
    try {
      await flow.worker.evaluate(failure => {
        const set = chrome.storage.local.set.bind(chrome.storage.local);
        const remove = chrome.storage.local.remove.bind(chrome.storage.local);
        let failed = false;
        chrome.storage.local.set = async values => {
          if (failure === "final-write-once" && !failed && values.quickvintBatchRecovery?.status === "done") {
            failed = true;
            throw new Error("Controlled terminal checkpoint failure");
          }
          return set(values);
        };
        chrome.storage.local.remove = async keys => {
          if (failure === "request-remove-once" && !failed && [keys].flat().includes("quickvintBatchGenerationRequest")) {
            failed = true;
            throw new Error("Controlled completed request removal failure");
          }
          if (failure === "terminal-remove" && [keys].flat().includes("quickvintBatchRecovery")) {
            throw new Error("Controlled terminal removal failure");
          }
          return remove(keys);
        };
      }, failure);
      await flow.context.route("https://autolister.app/api/phone-upload**", async route => {
        if (new URL(route.request().url()).searchParams.get("action") === "cleanup") {
          completionAtCleanup = (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery;
        }
        return route.fallback();
      });
      await flow.start();
      await expect(flow.controller.locator(".batch-title")).toHaveText("Listings ready");
      await expect.poll(() => flow.cleanup.length).toBe(1);
      expect(completionAtCleanup.status).toBe("done");
      expect(completionAtCleanup.completedCount).toBe(1);
      expect(flow.requests).toHaveLength(1);
      expect(flow.commits.size).toBe(1);
      await flow.controller.reload();
      await expect(flow.controller.locator("#quickvint-phone-btn")).toBeVisible();
      const restored = await sendFromExtensionContent(flow.context, flow.controller, { type: "GET_BATCH_RECOVERY" });
      expect(restored.recovery?.status || "done").toBe("done");
      await expect(flow.controller.locator(".batch-recovery-resume")).toHaveCount(0);
      const next = await sendFromExtensionContent(flow.context, flow.controller, {
        type: "START_BATCH_GENERATION", sessionId: "next-local-session", inputSource: "phone", groups: [flow.files],
      });
      expect(next.ok).toBe(true);
      await expect.poll(() => flow.cleanup.length).toBe(2);
      expect(flow.requests).toHaveLength(2);
      expect(flow.commits.size).toBe(2);
    } finally { await flow.close(); }
  });
}

test("persistent terminal checkpoint failure preserves photos and exact request for safe recovery", async () => {
  const flow = await openBatchJourney();
  try {
    await flow.worker.evaluate(() => {
      const set = chrome.storage.local.set.bind(chrome.storage.local);
      globalThis.__qaRejectTerminal = true;
      chrome.storage.local.set = async values => {
        if (globalThis.__qaRejectTerminal && values.quickvintBatchRecovery?.status === "done") {
          throw new Error("Controlled persistent terminal checkpoint failure");
        }
        return set(values);
      };
    });
    await flow.start();
    await expect(flow.controller.locator(".batch-recovery-resume")).toBeVisible();
    const saved = await flow.worker.evaluate(() => chrome.storage.local.get(["quickvintBatchRecovery", "quickvintBatchGenerationRequest"]));
    expect(saved.quickvintBatchRecovery.completedCount).toBe(0);
    expect(saved.quickvintBatchRecovery.groups[0]).toHaveLength(2);
    expect(saved.quickvintBatchGenerationRequest.requestId).toBe(flow.requests[0].id);
    expect(flow.cleanup).toHaveLength(0);
    await flow.controller.reload();
    await expect(flow.controller.locator(".batch-recovery-resume")).toHaveText("Resume 1 remaining");
    await flow.worker.evaluate(() => { globalThis.__qaRejectTerminal = false; });
    await flow.controller.locator(".batch-recovery-resume").click();
    await expect.poll(() => flow.cleanup.length).toBe(1);
    expect(flow.requests).toHaveLength(2);
    expect(flow.requests[1].id).toBe(flow.requests[0].id);
    expect(flow.requests[1].rawBody).toBe(flow.requests[0].rawBody);
    expect(flow.commits.size).toBe(1);
  } finally { await flow.close(); }
});

test("persistent completed-request cleanup failure keeps terminal proof until storage recovers", async () => {
  const flow = await openBatchJourney();
  try {
    await flow.worker.evaluate(() => {
      const remove = chrome.storage.local.remove.bind(chrome.storage.local);
      globalThis.__qaRejectRequestRemoval = true;
      chrome.storage.local.remove = async keys => {
        if (globalThis.__qaRejectRequestRemoval && [keys].flat().includes("quickvintBatchGenerationRequest")) {
          throw new Error("Controlled persistent request removal failure");
        }
        return remove(keys);
      };
    });
    await flow.start();
    await expect(flow.controller.locator(".batch-title")).toHaveText("Listings ready");
    await expect.poll(() => flow.cleanup.length).toBe(1);
    const saved = await flow.worker.evaluate(() => chrome.storage.local.get(["quickvintBatchRecovery", "quickvintBatchGenerationRequest"]));
    expect(saved.quickvintBatchRecovery.status).toBe("done");
    expect(saved.quickvintBatchGenerationRequest.requestId).toBe(flow.requests[0].id);
    const work = flow.context.pages().find(page => page !== flow.controller && page.url().includes("/items/new"));
    await work.reload();
    await expect(work.locator("#quickvint-phone-btn")).toBeVisible();
    const workRecovery = await sendFromExtensionContent(flow.context, work, { type: "GET_BATCH_RECOVERY" });
    expect(workRecovery.nudge).toBe(false);
    await expect(work.locator(".quickvint-batch-recovery-return")).toHaveCount(0);
    await flow.controller.reload();
    await expect(flow.controller.locator("#quickvint-phone-btn")).toBeVisible();
    const message = { type: "START_BATCH_GENERATION", sessionId: "next-local-session", inputSource: "phone", groups: [flow.files] };
    const blocked = await sendFromExtensionContent(flow.context, flow.controller, message);
    expect(blocked.ok).toBe(false);
    expect(blocked.code).toBe("batch_cleanup_failed");
    expect(flow.requests).toHaveLength(1);
    const retained = await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"));
    expect(retained.quickvintBatchRecovery.batchId).toBe(saved.quickvintBatchRecovery.batchId);
    await flow.worker.evaluate(() => { globalThis.__qaRejectRequestRemoval = false; });
    expect((await sendFromExtensionContent(flow.context, flow.controller, message)).ok).toBe(true);
    await expect.poll(() => flow.cleanup.length).toBe(2);
    expect(flow.requests).toHaveLength(2);
    expect(flow.commits.size).toBe(2);
  } finally { await flow.close(); }
});

test("an expired batch can reopen its missing controller and start a new batch from its listing tab", async () => {
  const flow = await openBatchJourney({ generate: ({ route, requests, request, commits }) => requests.length === 1
    ? route.fulfill({ status: 400, json: { error: "Controlled invalid input" } })
    : route.fulfill({ json: commits.get(request.id) }) });
  try {
    await flow.start();
    await expect(flow.controller.locator(".batch-recovery-resume")).toBeVisible();
    const work = flow.context.pages().find(page => page !== flow.controller && page.url().includes("/items/new"));
    await expect(work.locator(".quickvint-batch-recovery-return")).toBeVisible();
    await work.locator(".quickvint-batch-recovery-return").click();
    const expiringSession = (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery.sessionId;
    await flow.context.route("https://autolister.app/api/phone-upload**", route => {
      const url = new URL(route.request().url());
      return route.request().method() === "GET" && url.searchParams.get("includeUrls") === "1" && url.searchParams.get("sessionId") === expiringSession
        ? route.fulfill({ status: 410, json: { error: "Controlled expired upload" } }) : route.fallback();
    });
    await flow.controller.locator(".batch-recovery-resume").click();
    await expect(flow.controller.locator(".batch-title")).toHaveText("Batch expired");
    await flow.controller.close();
    await expect(work.locator(".quickvint-batch-recovery-return")).toBeVisible();
    await expect(work.locator("#quickvint-batch-recovery-title")).toHaveText("Upload expired");
    const recreated = flow.context.waitForEvent("page");
    await work.locator(".quickvint-batch-recovery-return").click();
    await recreated;
    const restored = flow.context.pages().find(page => page !== work && !page.isClosed() && page.url().includes("/items/new"));
    await expect(restored.locator(".batch-title")).toHaveText("Batch expired");
    await restored.locator(".batch-recovery-discard").click();
    await restored.locator(".quickvint-upload-choice-multiple").click();
    await expect(restored.locator(".batch-photo")).toHaveCount(2);
    await restored.locator(".batch-photo").nth(0).click();
    await restored.locator(".batch-photo").nth(1).click();
    await restored.locator(".batch-mark-group").click();
    await restored.locator(".batch-start").click();
    await expect(restored.locator(".batch-title")).toHaveText("Listings ready");
    expect(flow.requests).toHaveLength(2);
    expect(flow.cleanup).toEqual(["cancelled", "completed"]);
  } finally { await flow.close(); }
});

test("a late completed-batch dismissal cannot erase a newly started batch", async () => {
  let finish;
  const mayFinish = new Promise(resolve => { finish = resolve; });
  const flow = await openBatchJourney({ generate: async ({ route, requests, request, commits }) => {
    if (requests.length === 2) await mayFinish;
    return route.fulfill({ json: commits.get(request.id) });
  } });
  let discarding;
  try {
    await flow.worker.evaluate(() => {
      globalThis.__qaOriginalRemove = chrome.storage.local.remove.bind(chrome.storage.local);
      chrome.storage.local.remove = async keys => {
        if ([keys].flat().includes("quickvintBatchRecovery")) throw new Error("Keep the completed checkpoint for this race test");
        return globalThis.__qaOriginalRemove(keys);
      };
    });
    await flow.start();
    await expect(flow.controller.locator(".batch-title")).toHaveText("Listings ready");
    await expect.poll(async () => (await sendFromExtensionContent(flow.context, flow.controller, { type: "QUICKVINT_TAB_JOB_HEARTBEAT", kind: "batch" })).active).toBe(false);
    const old = (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery;
    await flow.worker.evaluate(() => {
      let held = false;
      chrome.storage.local.remove = async keys => {
        if (!held && [keys].flat().includes("quickvintBatchRecovery")) {
          held = true;
          globalThis.__qaRemovalHeld = true;
          await new Promise(resolve => { globalThis.__qaReleaseRemoval = resolve; });
        }
        return globalThis.__qaOriginalRemove(keys);
      };
    });
    discarding = sendFromExtensionContent(flow.context, flow.controller, { type: "DISCARD_BATCH_RECOVERY", batchId: old.batchId });
    await expect.poll(() => flow.worker.evaluate(() => globalThis.__qaRemovalHeld)).toBe(true);
    const starting = sendFromExtensionContent(flow.context, flow.controller, { type: "START_BATCH_GENERATION", sessionId: "next-local-session", inputSource: "phone", groups: [flow.files] });
    await expect.poll(() => flow.worker.evaluate(() => activeTabJob?.kind === "batch")).toBe(true);
    // Give an unguarded new checkpoint time to reach the held old removal.
    // A serialized implementation keeps that write behind the removal.
    await flow.controller.waitForTimeout(250);
    await flow.worker.evaluate(() => globalThis.__qaReleaseRemoval());
    await discarding;
    const next = await starting;
    expect(next.ok).toBe(true);
    const retained = (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery;
    expect(retained?.batchId).toBe(next.batchId);
    expect(retained.status).toBe("running");
    await expect.poll(() => flow.requests.length).toBe(2);
    finish();
    await expect.poll(() => flow.cleanup.length).toBe(2);
  } finally {
    await flow.worker.evaluate(() => globalThis.__qaReleaseRemoval?.()).catch(() => {});
    finish();
    await discarding?.catch(() => {});
    await flow.close();
  }
});
