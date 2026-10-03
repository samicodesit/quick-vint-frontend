const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const phonePage = path.resolve(__dirname, "../../../quick-vint-api/src/pages/phone-upload.html");
test.skip(!fs.existsSync(phonePage), "Coordinated phone-page checks require the backend checkout.");

async function openPhone(page, query, metadata) {
  const calls = { prepare: [], complete: [], uploads: 0, generation: 0, cleanup: 0 };
  await page.addInitScript(() => {
    window.__phoneEvents = [];
    window.AutoListerWebsiteTelemetry = { setContextProvider() {}, track(event, data) { window.__phoneEvents.push({ event, data }); }, flush: async () => {} };
    window.confirm = () => true;
  });
  await page.route("**/*", async route => {
    const request = route.request(); const url = new URL(request.url());
    const json = (status, data, headers) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data), headers });
    if (url.pathname === "/phone-upload") return route.fulfill({ contentType: "text/html", body: fs.readFileSync(phonePage, "utf8") });
    if (url.pathname === "/phone-upload-recovery.js") return route.fulfill({ contentType: "application/javascript", body: fs.readFileSync(path.resolve(__dirname, "../../lib/phone-upload-recovery.js"), "utf8") });
    if (url.pathname === "/api/phone-upload") {
      const action = url.searchParams.get("action");
      if (action === "status") return json(200, { status: "uploading", complete: false });
      if (action === "cleanup") { calls.cleanup++; return json(200, { success: true }); }
      if (action === "prepare" || action === "complete") {
        calls[action].push({ url: request.url(), body: request.postData() });
        const outcome = metadata(action, calls[action].length);
        if (outcome?.network) return route.abort("failed");
        return json(outcome?.status || 200, outcome?.data || { success: true, complete: action === "complete" ? true : undefined }, outcome?.headers);
      }
      calls.uploads++; return json(200, { success: true, files: [{ size: 100 }] });
    }
    if (url.pathname.includes("generate") || url.pathname.includes("checkout")) calls.generation++;
    return route.fulfill({ contentType: "application/javascript", body: "" });
  });
  await page.goto(`https://autolister.app/phone-upload?s=550e8400-e29b-41d4-a716-446655440099${query}`);
  return calls;
}
async function addPhoto(page) {
  await page.evaluate(async () => {
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 20;
    const context = canvas.getContext("2d"); context.fillStyle = "blue"; context.fillRect(0, 0, 20, 20);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg"));
    const transfer = new DataTransfer(); transfer.items.add(new File([blob], "fixture.jpg", { type: "image/jpeg" }));
    const input = document.querySelector("#fileInput"); input.files = transfer.files; input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
for (const mode of ["", "&mode=batch"]) {
  test(`legacy ${mode ? "batch" : "single"} retries confirmation without reuploading photos`, async ({ page }) => {
    const calls = await openPhone(page, mode, (action, attempt) => action === "complete" && attempt <= 3 ? { network: true } : {});
    await addPhoto(page);
    await expect(page.locator("#sendBtn")).toHaveText("Retry confirmation", { timeout: 10000 });
    await expect(page.locator("#sendBtn")).toBeEnabled();
    expect(calls.uploads).toBe(1); expect(calls.complete).toHaveLength(3);
    await page.locator("#sendBtn").click();
    await expect(page.locator("#sendBtn")).toBeHidden();
    expect(calls.complete).toHaveLength(4); expect(calls.uploads).toBe(1); expect(calls.generation).toBe(0);
    expect(new Set(calls.complete.map(call => call.url))).toHaveProperty("size", 1);
    expect(new Set(calls.complete.map(call => call.body))).toHaveProperty("size", 1);
  });
  test(`v2 ${mode ? "batch" : "single"} preserves selected photos after preparation exhausts`, async ({ page }) => {
    const calls = await openPhone(page, `&v=2${mode}`, (action, attempt) => action === "prepare" && attempt <= 3 ? { status: 503, data: { code: "DatabaseError", retryable: true } } : {});
    await addPhoto(page);
    await expect(page.locator("#mainBtn")).toContainText("Retry 1 failed photo", { timeout: 10000 });
    await expect(page.locator("#mainBtn")).toBeEnabled(); expect(calls.uploads).toBe(0); expect(calls.prepare).toHaveLength(3);
    await expect(page.locator(".file-item")).toHaveCount(1);
    await page.locator("#mainBtn").click();
    await expect(page.locator("#pageCopy")).toHaveText("1 photos ready on your computer");
    expect(calls.uploads).toBe(1); expect(calls.prepare).toHaveLength(4); expect(calls.generation).toBe(0);
    expect(new Set(calls.prepare.map(call => call.url)).size).toBe(1);
  });
}
test("v2 cancellation stops preparation recovery and retains the cancelled screen", async ({ page }) => {
  const calls = await openPhone(page, "&v=2&mode=batch", action => action === "prepare" ? { status: 503, data: { retryable: true } } : {});
  await addPhoto(page);
  await expect(page.locator("#pageCopy")).toHaveText("Connection interrupted. Retrying…");
  await page.locator("#cancelBtn").click();
  await expect(page.locator("#pageTitle")).toHaveText("Upload Cancelled");
  await page.waitForTimeout(1800);
  expect(calls.prepare).toHaveLength(1); expect(calls.uploads).toBe(0); expect(calls.cleanup).toBe(1);
  await expect(page.locator("#fileInput")).toBeDisabled();
});
test("long Retry-After preserves photos and disables Retry until permitted", async ({ page }) => {
  await page.clock.install();
  const calls = await openPhone(page, "&v=2", (action, attempt) => action === "prepare" && attempt === 1 ? { status: 429, data: { retryable: true }, headers: { "Retry-After": "60" } } : {});
  await addPhoto(page);
  await expect(page.locator("#mainBtn")).toContainText("Retry 1 failed photo");
  await expect(page.locator("#mainBtn")).toBeDisabled(); expect(calls.prepare).toHaveLength(1); expect(calls.uploads).toBe(0);
  await page.clock.fastForward(60001);
  await expect(page.locator("#mainBtn")).toBeEnabled();
  await page.locator("#mainBtn").click();
  await expect(page.locator("#pageCopy")).toHaveText("1 photos ready on your computer");
  expect(calls.prepare).toHaveLength(2); expect(calls.uploads).toBe(1);
});
