const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test, expect, chromium } = require("@playwright/test");

test("removing every manual photo retires its storage session before adding a new photo", async () => {
  const extension = process.env.AUTOLISTER_EXTENSION_PATH
    ? path.resolve(process.env.AUTOLISTER_EXTENSION_PATH)
    : path.resolve(__dirname, "../..");
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "autolister-manual-session-"));
  const uploads = [];
  const cleanups = [];
  const listedSessions = [];
  const storedFiles = new Map();
  const context = await chromium.launchPersistentContext(profile, {
    channel: "chromium", headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  try {
    // Real installed content script, worker, file-input events, image encoding,
    // and multipart requests. External storage and marketplace are isolated.
    const worker = context.serviceWorkers()[0] || await context.waitForEvent("serviceworker");
    await worker.evaluate(() => {
      globalThis.fetch = () => Promise.reject(new Error("External services isolated"));
    });
    await context.route("**/*", async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.href === "https://www.vinted.nl/items/new") {
        return route.fulfill({ status: 200, contentType: "text/html",
          body: fs.readFileSync(path.resolve(__dirname, "../fixtures/vinted-listing.html"), "utf8") });
      }
      if (url.origin === "https://autolister.app" && url.pathname === "/api/phone-upload") {
        if (request.method() === "OPTIONS") return route.fulfill({ status: 204,
          headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" } });
        if (url.searchParams.get("action") === "cleanup") {
          cleanups.push(url.searchParams.get("sessionId"));
          storedFiles.delete(url.searchParams.get("sessionId"));
          return route.fulfill({ status: 200, contentType: "application/json",
            headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ success: true }) });
        }
        const session = url.searchParams.get("sessionId");
        if (request.method() === "GET") {
          listedSessions.push(session);
          const files = (storedFiles.get(session) || []).map(file => ({ ...file,
            url: `https://storage.test/${session}/${file.name}` }));
          return route.fulfill({ status: 200, contentType: "application/json",
            headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({
              files, count: files.length, expectedCount: null, complete: false }) });
        }
        const body = request.postDataBuffer().toString("latin1");
        const order = Number(body.match(/name="uploadOrder"\r\n\r\n(\d+)/)?.[1]);
        uploads.push({ session, order, body });
        const file = { name: `${String(order).padStart(6, "0")}-upload.jpg`, order,
          path: `${session}/${String(order).padStart(6, "0")}-upload.jpg`, type: "image/jpeg", size: body.length };
        const files = storedFiles.get(session) || [];
        files[order] = file;
        storedFiles.set(session, files);
        return route.fulfill({ status: 200, contentType: "application/json",
          headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ success: true,
            count: 1, expectedCount: 1, files: [file] }) });
      }
      return route.abort();
    });
    const page = await context.newPage();
    await page.goto("https://www.vinted.nl/items/new");
    await expect(page.locator("#quickvint-gen-btn")).toBeAttached();
    const photo = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 1600; canvas.height = 1200;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#2459a2"; ctx.fillRect(0, 0, 1600, 1200);
      return canvas.toDataURL("image/png").split(",")[1];
    });
    const buffer = Buffer.from(photo, "base64");
    await page.setInputFiles('[data-testid="add-photos-input"]', { name: "first.png", mimeType: "image/png", buffer });
    await expect.poll(() => uploads.length).toBe(1);
    await expect.poll(() => listedSessions.length).toBe(1);
    await expect(page.locator("#quickvint-gen-btn")).not.toContainText("Preparing");
    await page.setInputFiles('[data-testid="add-photos-input"]', { name: "appended.png", mimeType: "image/png", buffer });
    await expect.poll(() => uploads.length).toBe(2);
    await expect.poll(() => listedSessions.length).toBe(2);
    expect(uploads[1].session).toBe(uploads[0].session);
    expect(cleanups).toEqual([]);
    await page.locator(".photo-box").evaluate(node => node.parentElement.appendChild(node.cloneNode(true)));
    // Separate DOM removals exercise the actual content-script observer used
    // when the marketplace removes each visible photo.
    await page.locator(".photo-box").last().evaluate(node => node.remove());
    await page.locator(".photo-box").evaluate(node => node.remove());
    await page.setInputFiles('[data-testid="add-photos-input"]', { name: "replacement.png", mimeType: "image/png", buffer });
    await expect.poll(() => uploads.length).toBe(3);
    await expect.poll(() => listedSessions.length).toBe(3);
    await expect.poll(() => cleanups.length).toBe(1);
    expect(cleanups).toEqual([uploads[0].session]);
    expect(uploads[2].session).not.toBe(uploads[0].session);
    expect(uploads.map(upload => upload.order)).toEqual([0, 1, 0]);
    expect(uploads[2].body).toContain("Content-Type: image/jpeg");
    expect(uploads[2].body).toContain('filename="replacement.jpg"');
    expect(listedSessions).toEqual([uploads[0].session, uploads[0].session, uploads[2].session]);
  } finally {
    await context.close();
    fs.rmSync(profile, { recursive: true, force: true });
  }
});
