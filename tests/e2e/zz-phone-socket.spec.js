const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");

for (const mode of [
  "automatic",
  "manual after controlled deadline",
  "cancel",
]) {
  test(`real socket loss preserves five selected photos: ${mode}`, async ({
    page,
  }) => {
    test.setTimeout(60000);
    const api =
      process.env.AUTOLISTER_API_PATH ||
      path.resolve(__dirname, "../../../quick-vint-api");
    test.skip(
      !fs.existsSync(path.join(api, "src/pages/phone-upload.html")),
      "API checkout is not available",
    );
    let disconnected = true;
    let received = 0;
    let cleanups = 0;
    const successfulOrders = [];
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, "http://localhost");
      if (url.pathname === "/phone-upload") {
        res.setHeader("Content-Type", "text/html");
        return res.end(
          fs.readFileSync(path.join(api, "src/pages/phone-upload.html")),
        );
      }
      if (url.pathname.endsWith(".js")) {
        const file = path.join(api, "public", path.basename(url.pathname));
        if (fs.existsSync(file)) {
          res.setHeader("Content-Type", "application/javascript");
          return res.end(fs.readFileSync(file));
        }
      }
      if (
        url.pathname === "/api/phone-upload" &&
        url.searchParams.get("action") === "cleanup"
      )
        cleanups++;
      if (
        url.pathname === "/api/phone-upload" &&
        req.method === "POST" &&
        !url.searchParams.has("action")
      ) {
        if (disconnected) return req.socket.destroy();
        const chunks = [];
        req.on("data", (chunk) => {
          received += chunk.length;
          chunks.push(chunk);
        });
        req.on("end", () => {
          const order = Buffer.concat(chunks)
            .toString("latin1")
            .match(/name="uploadOrder"\r\n\r\n(\d+)/);
          successfulOrders.push(order ? Number(order[1]) : null);
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({ status: "active", files: [{ size: 1000 }] }),
          );
        });
        return;
      }
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ status: "active", files: [] }));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      await page.addInitScript(() => {
        window.__uploadSends = 0;
        window.__uploadTimeOffset = 0;
        const actualNow = Date.now.bind(Date);
        // Only the deadline case advances time. Sockets, XHR and timers stay real.
        Date.now = () => actualNow() + window.__uploadTimeOffset;
        const open = XMLHttpRequest.prototype.open;
        const send = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function (method, url, ...args) {
          const parsed = new URL(url, location.href);
          this.__isPhotoPost =
            method === "POST" &&
            parsed.pathname === "/api/phone-upload" &&
            !parsed.searchParams.has("action");
          return open.call(this, method, url, ...args);
        };
        XMLHttpRequest.prototype.send = function (...args) {
          if (this.__isPhotoPost) window.__uploadSends++;
          return send.apply(this, args);
        };
      });
      await page.goto(
        `http://127.0.0.1:${server.address().port}/phone-upload?v=2&s=00000000-0000-4000-8000-000000000001`,
      );
      const jpeg = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 1600;
        canvas.height = 1200;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#725a48";
        ctx.fillRect(0, 0, 1600, 1200);
        ctx.fillStyle = "#f2c991";
        ctx.fillRect(100, 100, 1000, 800);
        return canvas.toDataURL("image/jpeg", 0.9).split(",")[1];
      });
      await page
        .locator("#fileInput")
        .setInputFiles(
          Array.from({ length: 5 }, (_, i) => ({
            name: `photo-${i}.jpg`,
            mimeType: "image/jpeg",
            buffer: Buffer.from(jpeg, "base64"),
          })),
        );
      await expect(page.locator(".file-item")).toHaveCount(5);
      await expect(
        page.getByText("Waiting for connection…", { exact: true }).first(),
      ).toBeVisible();
      if (mode === "cancel") {
        page.once("dialog", async (dialog) => {
          expect(dialog.type()).toBe("confirm");
          expect(dialog.message()).toBe(
            "Cancel this upload and discard its temporary photos?",
          );
          await dialog.accept();
        });
        await page.locator("#cancelBtn").click();
        await expect(page.locator("#pageTitle")).toHaveText("Upload Cancelled");
        await expect(page.locator("#fileInput")).toBeDisabled();
        await expect.poll(() => cleanups).toBe(1);
        const sendsAfterCancel = await page.evaluate(
          () => window.__uploadSends,
        );
        disconnected = false;
        // Beyond the initial 700ms retry, using real timers and sockets.
        await page.waitForTimeout(1100);
        expect(await page.evaluate(() => window.__uploadSends)).toBe(
          sendsAfterCancel,
        );
        expect(successfulOrders).toEqual([]);
        return;
      }
      if (mode === "manual after controlled deadline") {
        // Two concurrent uploads exhaust per-file windows in successive waves.
        // This checks deadline handling, not native two-minute elapsed timing.
        await expect
          .poll(
            async () => {
              if (
                (await page.locator("#mainBtn").textContent()).includes(
                  "Retry 5 failed photos",
                )
              )
                return true;
              await page.evaluate(() => {
                window.__uploadTimeOffset += 120001;
              });
              return false;
            },
            { timeout: 15000, intervals: [400] },
          )
          .toBe(true);
        await expect(page.locator(".file-item")).toHaveCount(5);
      }
      const sendsBeforeRecovery = await page.evaluate(
        () => window.__uploadSends,
      );
      disconnected = false;
      if (mode === "manual after controlled deadline")
        await page.locator("#mainBtn").click();
      await expect(page.locator("#mainBtn")).toHaveText(/Add more photos/, {
        timeout: 15000,
      });
      await expect(page.locator(".file-item")).toHaveCount(5);
      expect(successfulOrders.slice().sort((a, b) => a - b)).toEqual([
        0, 1, 2, 3, 4,
      ]);
      if (mode === "manual after controlled deadline") {
        expect(await page.evaluate(() => window.__uploadSends)).toBe(
          sendsBeforeRecovery + 5,
        );
      }
      expect(received).toBeGreaterThan(5000);
      await expect(page.locator("#cancelBtn")).toBeVisible();
    } finally {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  });
}
