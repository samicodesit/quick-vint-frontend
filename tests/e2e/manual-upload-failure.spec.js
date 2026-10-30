const { test, expect } = require("@playwright/test");
const { openBatchJourney } = require("./batch-journey");

test("handles exhausted manual upload transport without an unhandled rejection and retains photos across worker recovery", async () => {
  const journey = await openBatchJourney();
  try {
    // Worker restart may restore the synthetic session. Keep that SDK request
    // isolated as well as the upload and model endpoints.
    await journey.context.route("https://*.supabase.co/**", route => route.abort());
    let unavailable = true;
    const attempts = [];
    await journey.context.route("https://autolister.app/api/phone-upload**", route => {
      if (route.request().method() !== "POST") return route.fulfill({
        status: 200, contentType: "application/json", body: JSON.stringify({ files: [] }),
      });
      const order = Number(route.request().postDataBuffer().toString("latin1").match(/name="uploadOrder"\r\n\r\n(\d+)/)?.[1]);
      attempts.push(order);
      if (unavailable) return route.abort("connectionreset");
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
        success: true, files: [{ order, name: `photo-${order}.jpg`, path: `retained/${order}.jpg`, url: `https://storage.test/photo-${order}.jpg` }],
      }) });
    });
    const photo = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64");
    await journey.controller.setInputFiles('[data-testid="add-photos-input"]',
      Array.from({ length: 4 }, (_, index) => ({ name: `retained-${index}.png`, mimeType: "image/png", buffer: photo })));
    await expect.poll(() => journey.events.filter(event => event.event === "manual_upload_storage_error").length).toBe(1);
    expect(attempts).toHaveLength(9);
    expect(journey.requests).toHaveLength(0);
    expect(journey.events.filter(event => event.event === "own_context_exception")).toEqual([]);
    await expect(journey.controller.locator("#quickvint-gen-btn")).toBeEnabled();
    await journey.restartWorker();
    unavailable = false;
    await journey.controller.locator("#quickvint-gen-btn").click();
    await expect.poll(() => journey.requests.length).toBe(1);
    expect(journey.requests[0].body.imageUrls).toEqual(
      Array.from({ length: 4 }, (_, index) => `https://storage.test/photo-${index}.jpg`));
    expect(await journey.controller.locator('[data-testid="add-photos-input"]').evaluate(input => input.files.length)).toBe(4);
    expect(journey.unexpected).toEqual([]);
  } finally {
    await journey.close();
  }
});
