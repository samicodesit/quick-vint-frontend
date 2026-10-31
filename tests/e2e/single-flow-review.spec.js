const { test, expect } = require("@playwright/test");
const { openBatchJourney } = require("./batch-journey");

test("opening and closing the upload chooser preserves its Phone/Computer icons and badge", async () => {
  const flow = await openBatchJourney();
  try {
    const button = flow.controller.locator("#quickvint-phone-btn");
    await expect(button.locator("svg")).toHaveCount(2);
    await button.click();
    await flow.controller.getByRole("button", { name: "Close upload choices", exact: true }).click();
    await expect(button.locator("svg")).toHaveCount(2);
    await expect(button.locator(".quickvint-phone-new-badge")).toHaveText("NEW");
    await button.click();
    await expect(flow.controller.locator(".quickvint-upload-choice-card")).toBeVisible();
  } finally { await flow.close(); }
});

test("manual generation becomes usable again after consumed storage URLs, including appended photos", async () => {
  const flow = await openBatchJourney({ generate: ({ route, requests }) => route.fulfill({
    json: { title: `Item ${requests.length}`, description: "Controlled single-item output", measurementAdvice: "" },
  }) });
  let releaseAppend;
  const appendMayFinish = new Promise(resolve => { releaseAppend = resolve; });
  const uploaded = [];
  try {
    await flow.context.route("https://autolister.app/api/phone-upload**", async route => {
      const request = route.request();
      if (new URL(request.url()).searchParams.get("action") === "cleanup") {
        return route.fulfill({ status: 204 });
      }
      if (request.method() === "POST") {
        const order = Number(request.postDataBuffer().toString("latin1").match(/name="uploadOrder"\r\n\r\n(\d+)/)?.[1]);
        expect(Number.isInteger(order)).toBe(true);
        if (order === 1) await appendMayFinish;
        uploaded[order] = { ...flow.files[order], order };
        return route.fulfill({ json: { success: true, count: 1, files: [uploaded[order]] } });
      }
      return route.fulfill({ json: { files: uploaded.filter(Boolean), count: uploaded.filter(Boolean).length, complete: true } });
    });
    const page = flow.controller;
    const photo = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64");
    const addPhoto = order => page.locator('[data-testid="add-photos-input"]').setInputFiles({
      name: `photo-${order}.png`, mimeType: "image/png", buffer: photo,
    });
    await addPhoto(0);
    await expect(page.locator("#quickvint-gen-btn")).toBeEnabled();
    await page.locator("#quickvint-gen-btn").click();
    await expect(page.locator('[data-testid="title--input"]')).toHaveValue("Item 1");
    expect(flow.requests[0].body.imageUrls).toEqual([flow.files[0].url]);
    await expect(page.locator("#quickvint-gen-btn")).toBeEnabled();
    await expect(page.locator("#quickvint-gen-btn .label")).toHaveText("Generate");

    await page.locator('[data-testid="description--input"]').fill("");
    await addPhoto(1);
    await expect(page.locator("#quickvint-gen-btn")).toBeDisabled();
    await expect(page.locator("#quickvint-gen-btn .label")).toHaveText("Preparing...");
    releaseAppend();
    await expect(page.locator("#quickvint-gen-btn")).toBeEnabled();
    await page.locator("#quickvint-gen-btn").click();
    await page.getByRole("button", { name: "Replace existing text", exact: true }).click();
    await expect.poll(() => flow.requests.length).toBe(2);
    await expect(page.locator('[data-testid="title--input"]')).toHaveValue("Item 2");
    expect(flow.requests[1].body.imageUrls).toHaveLength(2);
    expect(flow.requests[1].body.imageUrls[0]).toMatch(/^data:image\//);
    expect(flow.requests[1].body.imageUrls[1]).toBe(flow.files[1].url);
    await expect(page.locator("#quickvint-gen-btn")).toBeEnabled();
    expect(flow.requests).toHaveLength(2);
  } finally { releaseAppend(); await flow.close(); }
});

test("a normal tab close after typing hands the title edit to the extension worker", async () => {
  const flow = await openBatchJourney();
  try {
    const page = flow.controller;
    await page.locator('[data-testid="add-photos-input"]').setInputFiles({
      name: "photo-0.png", mimeType: "image/png",
      buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64"),
    });
    await page.locator("#quickvint-gen-btn").click();
    const title = page.locator('[data-testid="title--input"]');
    await expect(title).toHaveValue("Item 1");
    await title.fill("Item 1 size M");
    await page.close({ runBeforeUnload: true });
    const edits = () => flow.events.filter(e => e.event === "generation_output_edited");
    await expect.poll(() => edits().length).toBe(1);
    expect(edits()[0].context).toMatchObject({
      generatedTitle: "Item 1", finalTitle: "Item 1 size M",
      generationAttemptId: flow.requests[0].body.generationAttemptId,
    });
  } finally { await flow.close(); }
});
