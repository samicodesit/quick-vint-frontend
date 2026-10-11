const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");

test("real socket loss preserves five selected photos and manual retry recovers", async ({ page }) => {
  test.setTimeout(60000);
  const api = process.env.AUTOLISTER_API_PATH || path.resolve(__dirname, "../../../quick-vint-api");
  test.skip(!fs.existsSync(path.join(api, "src/pages/phone-upload.html")), "API checkout is not available");
  let disconnected = true;
  let attempts = 0;
  let received = 0;
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/phone-upload") {
      res.setHeader("Content-Type", "text/html");
      return res.end(fs.readFileSync(path.join(api, "src/pages/phone-upload.html")));
    }
    if (url.pathname.endsWith(".js")) {
      const file = path.join(api, "public", path.basename(url.pathname));
      if (fs.existsSync(file)) {
        res.setHeader("Content-Type", "application/javascript");
        return res.end(fs.readFileSync(file));
      }
    }
    if (url.pathname === "/api/phone-upload" && req.method === "POST" && !url.searchParams.has("action")) {
      attempts++;
      if (disconnected) return req.socket.destroy();
      req.on("data", chunk => { received += chunk.length; });
      req.on("end", () => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ status: "active", files: [{ size: 1000 }] }));
      });
      return;
    }
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ status: "active", files: [] }));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    await page.addInitScript(() => {
      window.__uploadSends = 0;
      const open = XMLHttpRequest.prototype.open;
      const send = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function(method, url, ...args) {
        this.__isPhotoPost = method === "POST" && new URL(url, location.href).pathname === "/api/phone-upload";
        return open.call(this, method, url, ...args);
      };
      XMLHttpRequest.prototype.send = function(...args) {
        if (this.__isPhotoPost) window.__uploadSends++;
        return send.apply(this, args);
      };
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/phone-upload?v=2&s=00000000-0000-4000-8000-000000000001`);
    const jpeg = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 1600; canvas.height = 1200;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#725a48"; ctx.fillRect(0, 0, 1600, 1200);
      ctx.fillStyle = "#f2c991"; ctx.fillRect(100, 100, 1000, 800);
      return canvas.toDataURL("image/jpeg", 0.9).split(",")[1];
    });
    await page.locator("#fileInput").setInputFiles(Array.from({ length: 5 }, (_, i) => ({ name: `photo-${i}.jpg`, mimeType: "image/jpeg", buffer: Buffer.from(jpeg, "base64") })));
    await expect(page.locator("#mainBtn")).toHaveText(/Retry 5 failed photos/, { timeout: 40000 });
    expect(await page.evaluate(() => window.__uploadSends)).toBe(15);
    // Chromium can transparently retry a reset socket. Count application sends
    // separately from wire attempts, rather than mistaking those for our retries.
    const failedWireAttempts = attempts;
    disconnected = false;
    await page.locator("#mainBtn").click();
    await expect(page.locator("#mainBtn")).toHaveText(/Add more photos/, { timeout: 15000 });
    expect(await page.evaluate(() => window.__uploadSends)).toBe(20);
    expect(attempts - failedWireAttempts).toBe(5);
    expect(received).toBeGreaterThan(5000);
    await expect(page.locator("#cancelBtn")).toBeVisible();
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
