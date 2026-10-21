const { test, expect } = require("@playwright/test");
const { openBatchJourney } = require("./batch-journey");

async function events(flow) {
  await flow.worker.evaluate(() => AutoListerBackgroundTelemetry.flush());
  const saved = await flow.worker.evaluate(
    async () =>
      (await chrome.storage.local.get("autolisterTelemetryV2"))
        .autolisterTelemetryV2,
  );
  return [...flow.events, ...(saved?.events || []).map((entry) => entry.event)];
}
for (let round = 1; round <= 3; round++)
  test(`photo timeout reports counts and same-batch user recovery, round ${round}`, async () => {
    test.setTimeout(120000);
    const flow = await openBatchJourney({
      photos: 4,
      groupSizes: [2, 2],
      rejectHostPhotos: true,
    });
    try {
      await flow.start();
      await expect.poll(() => flow.requests.length).toBe(1);
      const work = flow.context
        .pages()
        .find((p) => p !== flow.controller && p.url().includes("/items/new"));
      await expect(work.locator('[data-testid="title--input"]')).toHaveValue(
        "Item 1",
      );
      await work.evaluate(() => {
        const img = document.createElement("img");
        img.alt = "Uploaded photo 1";
        img.src = "https://images1.vinted.net/t/qa-0.png";
        document.querySelector('[data-testid="media-upload-grid"]').append(img);
      });
      await expect(
        flow.controller.locator(".batch-recovery-resume"),
      ).toBeVisible({ timeout: 75000 });
      const before = await flow.worker.evaluate(
        async () =>
          (await chrome.storage.local.get("quickvintBatchRecovery"))
            .quickvintBatchRecovery,
      );
      expect(before.groups.map((g) => g.length)).toEqual([2, 2]);
      const paused = (await events(flow)).find(
        (e) => e.event === "batch_paused",
      );
      expect(paused.context).toMatchObject({
        errorCode: "HOST_PHOTO_CONFIRMATION_TIMEOUT",
        phase: "host_photo_confirmation",
        expectedPhotoCount: 2,
        confirmedPhotoCount: 1,
        completedCount: 0,
        total: 2,
        photoGridPresent: true,
        pauseCount: 1,
      });
      expect(paused.context.durationMs).toBeGreaterThanOrEqual(60000);
      expect(paused.context.durationMs).toBeLessThan(70000);
      expect(flow.cleanup).toHaveLength(0);
      if (round === 3) await flow.restartWorker();
      await flow.context.addInitScript(() =>
        document.addEventListener(
          "change",
          (event) => {
            if (!event.target?.matches('input[type="file"]')) return;
            for (const [i] of Array.from(event.target.files).entries()) {
              const img = document.createElement("img");
              img.alt = "Uploaded photo " + i;
              img.src = "https://images1.vinted.net/t/qa-" + i + ".png";
              document
                .querySelector('[data-testid="media-upload-grid"]')
                .append(img);
            }
          },
          true,
        ),
      );
      await flow.controller.locator(".batch-recovery-resume").click();
      await expect.poll(() => flow.cleanup.length, { timeout: 15000 }).toBe(1);
      const complete = (await events(flow)).find(
        (e) => e.event === "batch_complete",
      );
      expect(complete.context).toMatchObject({
        batchId: paused.context.batchId,
        completedCount: 2,
        total: 2,
        resumeTrigger: "user_resume",
        resumeCount: 1,
        pauseCount: 1,
        recoveredFromPause: true,
        timingComplete: true,
      });
      expect(complete.context.recoveryAgeMs).toBeGreaterThanOrEqual(60000);
      expect(complete.context.pauseDurationMs).toBeGreaterThanOrEqual(0);
      expect(
        complete.context.activeDurationMs + complete.context.pauseDurationMs,
      ).toBe(complete.context.recoveryAgeMs);
      expect(flow.commits.size).toBe(2);
      expect(new Set(flow.requests.map((r) => r.id)).size).toBe(2);
    } finally {
      await flow.close();
    }
  });

test("broken timing observation cannot stop batch completion or change generation attempts", async () => {
  const flow = await openBatchJourney();
  try {
    await flow.worker.evaluate(() => {
      AutoListerFlowEvidence.batchTiming = () => {
        throw new Error("isolated diagnostic failure");
      };
    });
    await flow.start();
    await expect.poll(() => flow.cleanup.length).toBe(1);
    expect(flow.requests).toHaveLength(1);
    expect(flow.commits.size).toBe(1);
  } finally {
    await flow.close();
  }
});
